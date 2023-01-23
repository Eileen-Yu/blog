---
title: python game - Pig Game
categories: [tech]
---

## Rules：

The user and the computer play a game to roll the dice separately. The computer goes first.
In each round, you can choose whether to continue without throwing a 6.
Before that, all the scores of 1-5 can be accumulated and counted. Once a 6 is thrown, all the scores of this round will not be counted.
The first to reach 50 wins. If the tie is greater than 50, continue to the next round to determine the winner.

## Code：

```python
import random
import re


humanTotalScore = 0
computerTotalScore = 0


def show_results():
    global computerTotalScore
    global humanTotalScore

    if computerTotalScore < humanTotalScore:
        print("You win by {} points.".format(humanTotalScore - computerTotalScore))
    elif computerTotalScore > humanTotalScore:
        print("You lose by {} points.".format(computerTotalScore - humanTotalScore))


def roll_again():
    return judge("Roll again?(y/n)")


def roll():
    result = random.randint(1, 6)
    print("Current roll:", result)
    return result


def is_game_over():
    global computerTotalScore
    global humanTotalScore
    return (computerTotalScore >= 50 or humanTotalScore >= 50) and computerTotalScore != humanTotalScore


def computer_move():
    print("======Bot Turn======")
    global computerTotalScore
    if computerTotalScore >= 50:
        return

    times = 4
    turn_score = 0
    while times > 0:
        current_roll = roll()

        if current_roll == 6:
            turn_score = 0
            break
        else:
            times = times - 1
            turn_score += current_roll

    computerTotalScore += turn_score
    print("Computer Score:", computerTotalScore)


def human_move():
    print("======Your Turn======")
    global humanTotalScore
    global computerTotalScore

    if humanTotalScore >= 50:
        return

    print("Your Score: {}, Computer Score: {}, Distance: {}".format(humanTotalScore, computerTotalScore,
                                                                    humanTotalScore - computerTotalScore))
    turn_score = 0

    while True:
        if not roll_again():
            break

        current_score = roll()

        if current_score == 6:
            return

        turn_score += current_score

    humanTotalScore += turn_score


def play_again():
    global humanTotalScore
    global computerTotalScore

    if not judge("Play again?(y/n)"):
        return False

    humanTotalScore = 0
    computerTotalScore = 0

    return True


def judge(hint_str):
    while True:
        response = input(hint_str)
        if re.match('[yY].*', response) is not None:
            return True
        if re.match('[nN].*', response) is not None:
            return False


def instruction():
    print("""Welcome to the game.You and the computer will take turns to roll a dice.
Every figure, except 6, will be added to your score, and if you roll a 6, the score for this turn is 0, and another player will do it.
The first player to reach or exceed 50 will win.
""")


def main():
    instruction()
    again_flag = True
    while again_flag:
        computer_move()
        human_move()
        if is_game_over():
            show_results()
            again_flag = play_again()


main()
```
