---
title: Building AI Werewolf with Dapr Workflow
date: 2026-11-23
categories: [tech]
tags: [Werewolf, Dapr, Workflow, Multi-Agent, LLM, Go]
---

<p align="center">
  <img src="/img/ai-werewolf-cover.jpg" alt="AI Werewolf">
</p>

Nine LLMs walk into a village. Three of them are lying. Several are confidently wrong. One thinks every disagreement is a leadership opportunity.

I built [AI Werewolf](https://github.com/Eileen-Yu/ai-werewolf) so they could do that on [Dapr Workflow](https://docs.dapr.io/developing-applications/building-blocks/workflow/) without the game master also going insane. The interesting engineering is not "nine agents in a loop." It is durable execution with humans in the same path as the models: a seat can wait five minutes for a person, survive a process kill, and resume without re-rolling the night or re-billing every speech that already finished. The prompts matter too — once the orchestrator works, the agents start exploiting whatever you wrote — but the workflow is what makes the game a system instead of a script.

### A prompt is not a security boundary

That is the whole architecture, really.

If you put every role in the context and write *"you are a villager, please don't peek"*, the model will peek. It will then vote out the real seer with a three-paragraph essay about trust. So the workflow holds `game.State` — every role, every potion, every night kill — and before each LLM call it builds a `brain.Turn` that contains only what that seat is allowed to know.

```go
turn := brain.Turn{
    Me:         *t.s.Player(name),
    Seats:      seats,              // name, death, sheriff — no Role field
    Transcript: t.s.VisibleTo(name),
    Notes:      t.s.Notes[name],
    Ballots:    t.s.Ballots,
}
if turn.Me.Role.IsWolf() {
    turn.Pack, turn.Wolves = t.s.LivingWolves(), t.s.Wolves()
    turn.Plan = t.s.PlanFor(t.s.Round)
}
```

`brain.Seat` literally has no role field. There is nothing for the prompt to "accidentally" include. Wolves get pack + night plan; everyone else gets claims marked unverified. The page a human plays from is filtered the same way — `gm` never hands the raw board to the browser.

Lying about the *game* is legal (wolves fake roles). Inventing a player who isn't seated is not. The host checks every answer and re-asks up to twice; after that, a bad pick becomes a pass and the game moves on. A bad answer can cost you your move. It can never stall nine other agents.

### One round per execution

`GameWorkflow` is boring on purpose:

```go
deaths, err := t.night()
// Day 1 only: sheriff election before the deaths are announced
if g.State.Round == 1 {
    err = t.election()
}
err = t.daybreak(deaths)
if g.State.Winner() == "" && !t.blasted {
    err = t.day()
}
if winner := g.State.Winner(); winner != "" {
    // judge MVP, aftermath chat, return Result
}
g.State.Round++
ctx.ContinueAsNew(g)
```

Everything non-deterministic — dealing roles, LLM calls, random draws on a tied wolf vote — lives in activities. That is the usual durable-execution deal: the orchestrator code must be deterministic on replay, so randomness and side effects are recorded as activity results.

A caveat worth saying out loud, because LLM activities are expensive side effects. If an activity has completed and its result is in the workflow history, replay reuses that result and does not call the model again. If the process dies after the HTTP response came back but before the completion is persisted, the activity can run again — another speech, another bill. The design reduces duplicate spend; it does not make LLM calls exactly-once. Activity retries (three attempts, exponential backoff) are for transient failures of the call itself, which for a chat completion also means you may pay for a partial attempt you never got to keep.

Continue-as-new between rounds keeps that history from growing into a novel. It is still the same workflow instance — same ID, same game — but a new execution whose history starts fresh, with the full `game.State` (and human seat keys) passed as input. One logical game, many executions of the same instance, not a pile of unrelated workflows.

### Parallel where the rules allow it

Werewolf is mostly waiting on models. Anything the rules don't force into order is scheduled at once: the seer's check beside the wolves at night, every exile vote by day. Speeches stay serial — each has to answer the last. Deaths stay serial too: last words, then the badge, then the hunter's shot.

Parallelism does not mean concurrent mutation. A day vote fans out every `act`, then `Await`s in seat order and only then writes notes and ballots. The models think together; the state machine still advances one commit at a time. On replay those awaits resolve from history in the same order, so you do not get a different ballot because two completions raced.

The interesting latency trick is speeches. Rewriting notes eats most of an LLM turn; the spoken line is the short bit at the end. So while speaker *n* is talking, speaker *n+1* already runs a silent `Prepare` turn that brings their notes up to date:

```go
m := t.act(turn)
if i+1 < len(order) && !t.s.Player(order[i+1]).Human {
    ahead = t.act(t.turn(brain.Prepare, order[i+1], nil))
}
a, err := t.said(turn, m, audience...)
```

When *n+1*'s turn comes, they only need to digest what *n* just said. A day of speeches costs roughly the longest turn × N, not a full note rewrite × N. Humans skip prep — they already know what they think, or claim to.

### Humans are just another move type

This is the part that is hard to fake with a plain agent loop, and the reason I wanted Dapr Workflow rather than "start nine goroutines and hope."

I did not want a second code path for "real people." Every move goes through `table.act`:

```go
func (t *table) act(turn brain.Turn) move {
    if turn.Me.Human {
        return t.busy(turn, t.askHuman(turn))
    }
    m := t.ctx.CallActivity(ActActivity, workflow.WithActivityInput(turn), retry)
    // ...
}
```

A human seat publishes a pending turn to the page, then waits on `WaitForExternalEvent("move-<round>-<n>", HumanTimeout+grace)`. The browser posts a move; `gm` raises that event. Same `settle` as an AI answer — a bad pick still becomes a pass. If the timer fires, the person is told privately and `ActActivity` covers for them. Votes asked of everyone still fan out; each person is one more durable waiter among the AIs.

Replay is what makes this more than a web handler with a sleep. An external event that already arrived is in the workflow history. After a restart, the orchestrator does not sit for another five minutes hoping you click again — it sees the event (or the cancellation) and continues. A timer that already fired stays fired. That is the difference between "the HTTP server came back" and "the game came back."

The white wolf king's blast is the awkward cousin, and it shows the same idea under pressure. He may explode after *any* speech, so the workflow cannot look expectant — that would broadcast "the king is still alive." After each speech it checks a *zero-timeout* external event: returns immediately with the blast or with nothing. Deterministic on replay, because the event is in the history or it isn't. An AI king is asked off the public "waiting on" channel for the same reason.

### Night math that fits in one line

Twelve-player boards have a guard. Guard stops the wolf kill. Witch antidote also stops the wolf kill. Both on the same player cancel — the classic "we saved him so hard he died" outcome:

```go
killed := victim != "" && (guarded == victim) == saved
```

XOR in a trench coat. Poison still kills through a guard. Unit tests cover guarded / saved / both / poisoned / neither, because this is the kind of rule people argue about at 2am and then implement wrong.

### Strategy lives in prompts; mechanics live in Go

Once the workflow could reliably run a game — deal, night, election, day, continue-as-new, a human seat that survives a restart — the harder problem became making sure the agents were playing Werewolf rather than exploiting my prompts.

The rules engine does not know what a "hook" is emotionally. It knows vote tallies, role abilities, and who may see which log lines. How to *play* sits in `brain/text.go` — two playbooks, Chinese and English, same structure.

Early mistake: I dealt every pack a forced fake-seer tactic and told the good side "wolves almost always claim first." Good players then beat the *implementation*. First claimant = suspect. Every wolf game sounded like the same radio play. The witch got "save early" and burned the antidote on Night 1 like it was a loyalty card.

So nothing is dealt now. Wolves see a menu of plays with costs (single fake, double claim, stay dark). Good players get *how* to weigh a claim, never a prior that the first speaker is lying. Win rates are not tuned with a thumb on the scale; `werewolf stats` just counts what actually happens across many games. If the pack always fakes, that shows up as a number, not as me editing prompts until the spreadsheet looks fair.

#### The pack used to have a CEO

One wolf used to write the night plan after chat. Everyone else's suggestions counted only if that wolf felt like typing them. A named faker was forced to claim. Democracy!

Now talk is not a move. Chat once around the table, then every living wolf submits `wolf_vote` in parallel: kill target, which side to wipe, tomorrow's push, and whether they personally volunteer to fake or hook. Strict majority. Tie → short rechat → revote → random among the tied if still stuck. Stances are shown to the pack as a guide that binds nobody. Volunteering is not an order — and a wolf who stayed quiet may still claim by day. The host finally stopped appointing a night dictator based on array index zero.

### Prompt bugs that look like strategy

These were not "AI is bad at Werewolf." These were me writing instructions that rewarded the wrong habit.

**Speech–vote consistency as a religion.** Players kept prosecuting "you changed your vote" and asking the same answered question until the sun came up. Articulate wolves walked free. An uncontested Guard claim with a clean protection history lost to a three-day-old ballot nitpick.

Fix (still just text): observations start from whichever evidence is informative *this turn* — claims, deaths, quiet nights, remaining roles, vote blocs — with mismatched votes as one clue among many. Evidence has weight. Five people repeating one reason are one reason. Explaining away a contradiction drops that contradiction; it does not baptize you as good. Before the exile vote, compare the top candidates on the hardest facts. In endgame, count whether a wrong exile loses the game outright. No scoring formula. Wolves get the same evidence model, so they know a TED Talk will not save a claim that fails the death record.

**Sheriff PK as copy-paste.** The PK reused the ordinary campaign/vote prompts. Voters had the new speeches and their previous ballot in context, and still stamped the same name again like a muscle memory.

The prompt now detects a sheriff PK from the last election ballot on the turn (`sheriffTie`). Candidates are told not to replay the campaign tape; win over the people who did *not* vote for you. Voters are reminded how they voted in the tie, told it binds nothing, and asked to compare again. Changing needs a reason; staying is fine; another tie is a legitimate outcome. We did not randomize votes or force a sheriff into existence. That would be cheating, and also less funny when the third PK ties and the village spends the rest of the game without a badge.

**Personality is not a side oracle.** Rivalries used to leak into "always suspect X." Now habit and rivalry shape tone and grudges; who you think is a wolf still has to come from what happened this game. Same character, different boards, different conclusions — or the cast is just a skin.

### So did the village get smarter?

I do not have a honest win-rate table to flash here. `werewolf stats` exists to count patterns across many LLM games — how often the pack fakes, whether Day 1 exiles a wolf, whether the witch burns the antidote on Night 1 — but I am not going to invent percentages for a blog. What I do have are games that forced the prompt changes above.

One early run is still the README's demo: the fake seer took the badge, the real seer went out on the sheriff's one-and-a-half votes, and his last words were *"Leadership lesson: consensus isn't verification."* That is the village playing the implementation. Later twelve-player games showed a different failure mode — players prosecuting speech–vote consistency until an uncontested Guard claim lost to a three-day-old ballot nitpick — which is why the evidence-weighting rewrite exists. The sheriff PK change came the same way: watching voters stamp the same name again after a tie, with the new speeches already in context.

The workflow side I will defend in a code review: filtered views, activities for LLM and RNG, continue-as-new on one instance, humans as external events that replay cleanly, the one-line night XOR. Kill `gm` mid-argument and the history still has every completed activity and every human event that already landed — with the at-least-once caveat on anything that had not finished persisting.

The prompt side is a bet. Unit tests prove the instructions are *present*. They do not prove nine models will suddenly stop worshipping vote consistency. That takes sitting through more games — preferably while LinkedIn Influencer drafts a post about "alignment under uncertainty" over the real seer's corpse.

I still like that outcome. A durable orchestrator that keeps liars honest about the *table*, and lets them lie about everything else. If you want to watch them fail in public, the repo is [github.com/Eileen-Yu/ai-werewolf](https://github.com/Eileen-Yu/ai-werewolf); the longer tradeoffs live in [`docs/design.md`](https://github.com/Eileen-Yu/ai-werewolf/blob/main/docs/design.md). Bring popcorn. Or a seat.
