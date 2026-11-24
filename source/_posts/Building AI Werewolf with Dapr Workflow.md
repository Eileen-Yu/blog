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

I built [AI Werewolf](https://github.com/Eileen-Yu/ai-werewolf) so they could do that on [Dapr Workflow](https://docs.dapr.io/developing-applications/building-blocks/workflow/) without the game master also going insane. This post is the implementation: how the workflow is shaped, where prompts sit relative to the rules engine, and the bugs that only show up after you've watched a fake seer win the badge on vibes alone.

## A prompt is not a security boundary

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

## One round per execution

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

Everything non-deterministic — dealing roles, LLM calls, random draws on a tied wolf vote — lives in activities. Kill the process mid-speech, restart it, and replay reads the recorded activity outputs instead of burning another pile of tokens on the same monologue about "alignment."

Continue-as-new between rounds keeps the history from growing into a novel. Same instance ID, fresh history, state as input. One game, many executions.

## Parallel where the rules allow it

Werewolf is mostly waiting on models. The workflow runs every move at once that the rules let it, and serializes only what has to answer the previous line.

| Phase | Parallel | Ordered |
|---|---|---|
| Night | Seer's check next to the wolves | Wolf chat in turn → all wolves vote at once → witch (needs the victim) |
| Day | Every exile vote | Speeches; next speaker prepares while this one talks |
| Death | — | Last words → badge → hunter shot |

The fun one is speech prep. Rewriting notes is most of an LLM turn's latency; the actual speech is the short bit at the end. Speeches still have to go one-by-one — each answers the last — so while speaker *n* talks, speaker *n+1* already runs a silent `Prepare` turn:

```go
m := t.act(turn)
if i+1 < len(order) && !t.s.Player(order[i+1]).Human {
    ahead = t.act(t.turn(brain.Prepare, order[i+1], nil))
}
a, err := t.said(turn, m, audience...)
```

When *n+1*'s turn arrives, their notes are current through the previous speech; they only need to digest what *n* just said. Wall clock for a day of speeches is roughly "longest turn × N", not "full rewrite × N". Humans skip prep — they already know what they think, or at least they claim to.

## Humans are just another move type

I did not want a second code path for "real people."

```go
func (t *table) act(turn brain.Turn) move {
    if turn.Me.Human {
        return t.busy(turn, t.askHuman(turn))
    }
    m := t.ctx.CallActivity(ActActivity, workflow.WithActivityInput(turn), retry)
    // ...
}
```

A human seat waits on `WaitForExternalEvent("move-<round>-<n>", timeout)`. Same `settle` as an AI answer. Timeout fires → `ActActivity` covers for them, and privately they get told the AI took the wheel. Votes asked of everyone still fan out; each person is one more waiter among the AIs.

The white wolf king's blast is the awkward cousin. He may explode after *any* speech, so the workflow cannot sit there looking expectant — that would broadcast "the king is still alive." After each speech it checks a zero-timeout external event: returns immediately with the blast or with nothing. Deterministic on replay, because the event is in the history or it isn't. An AI king is asked off the public "waiting on" channel for the same reason.

## Night math that fits in one line

Twelve-player boards have a guard. Guard stops the wolf kill. Witch antidote also stops the wolf kill. Both on the same player cancel — 奶穿, the classic "we saved him so hard he died" outcome:

```go
killed := victim != "" && (guarded == victim) == saved
```

XOR in a trench coat. Poison still kills through a guard. Unit tests cover guarded / saved / both / poisoned / neither, because this is the kind of rule people argue about at 2am and then implement wrong.

## Strategy lives in prompts; mechanics live in Go

The rules engine does not know what a "hook" is emotionally. It knows vote tallies, role abilities, and who may see which log lines. How to *play* sits in `brain/text.go` — two playbooks, Chinese and English, same structure.

Early mistake: I dealt every pack a forced fake-seer tactic and told the good side "wolves almost always claim first." Good players then beat the *implementation*. First claimant = suspect. Every wolf game sounded like the same radio play. The witch got "save early" and burned the antidote on Night 1 like it was a loyalty card.

So nothing is dealt now. Wolves see a menu of plays with costs (single fake, double claim, stay dark). Good players get *how* to weigh a claim, never a prior that the first speaker is lying. Win rates are not tuned with a thumb on the scale; `werewolf stats` just counts what actually happens across many games. If the pack always fakes, that shows up as a number, not as me editing prompts until the spreadsheet looks fair.

### The pack used to have a CEO

One wolf used to write the night plan after chat. Everyone else's suggestions counted only if that wolf felt like typing them. A named faker was forced to claim. Democracy!

Now talk is not a move. Chat once around the table, then every living wolf submits `wolf_vote` in parallel: kill target, which side to wipe, tomorrow's push, and whether they personally volunteer to fake or hook. Strict majority. Tie → short rechat → revote → random among the tied if still stuck. Stances are shown to the pack as a guide that binds nobody. Volunteering is not an order — and a wolf who stayed quiet may still claim by day. The host finally stopped appointing a night dictator based on array index zero.

## Prompt bugs that look like strategy

These were not "AI is bad at Werewolf." These were me writing instructions that rewarded the wrong habit.

**Speech–vote consistency as a religion.** Players kept prosecuting "you changed your vote" and asking the same answered question until the sun came up. Articulate wolves walked free. An uncontested Guard claim with a clean protection history lost to a three-day-old ballot nitpick.

Fix (still just text): observations start from whichever evidence is informative *this turn* — claims, deaths, quiet nights, remaining roles, vote blocs — with mismatched votes as one clue among many. Evidence has weight. Five people repeating one reason are one reason. Explaining away a contradiction drops that contradiction; it does not baptize you as good. Before the exile vote, compare the top candidates on the hardest facts. In endgame, count whether a wrong exile loses the game outright. No scoring formula. Wolves get the same evidence model, so they know a TED Talk will not save a claim that fails the death record.

**Sheriff PK as copy-paste.** The PK reused the ordinary campaign/vote prompts. Voters had the new speeches and their previous ballot in context, and still stamped the same name again like a muscle memory.

The prompt now detects a sheriff PK from the last election ballot on the turn (`sheriffTie`). Candidates are told not to replay the campaign tape; win over the people who did *not* vote for you. Voters are reminded how they voted in the tie, told it binds nothing, and asked to compare again. Changing needs a reason; staying is fine; another tie is a legitimate outcome. We did not randomize votes or force a sheriff into existence. That would be cheating, and also less funny when the third PK ties and the village spends the rest of the game without a badge.

**Personality is not a side oracle.** Rivalries used to leak into "always suspect X." Now habit and rivalry shape tone and grudges; who you think is a wolf still has to come from what happened this game. Same character, different boards, different conclusions — or the cast is just a skin.

**Chinese UI left English in the wolf-vote dropdown.** `fake seer` / `hook` showed raw because the page translates via a word map the server forgot to fill. Fixed with `PageWords`, plus a test that scrapes every `opts([...])` literal off `index.html` and demands Han characters for a Chinese board. CI is a better proofreader than I am at 1am.

## What I trust, what I don't

The durable bits I trust: filtered views, activities for LLM/RNG, continue-as-new, humans as external events, XOR-flavored night resolution. You can kill `gm` mid-argument; Catalyst's history does not care about your feelings.

The prompt bits I treat as hypotheses. Unit tests prove the instructions are *present*. They do not prove nine models will suddenly stop worshipping vote consistency. That takes watching games — preferably while LinkedIn Influencer drafts a post about "alignment under uncertainty" over the real seer's corpse.

Repo: [github.com/Eileen-Yu/ai-werewolf](https://github.com/Eileen-Yu/ai-werewolf). Longer design notes (with the actual tradeoffs spelled out): [`docs/design.md`](https://github.com/Eileen-Yu/ai-werewolf/blob/main/docs/design.md).
