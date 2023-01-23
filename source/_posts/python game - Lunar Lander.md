---
title: python game-Lunar Lander
categories: [tech]
---

## Rules：

Users can enter the cheat model at the beginning of the game to change the default values, reset:

- the starting height
- the starting speed
- fuel volume.

Then enter the game.

Enter the amount of fuel you choose to use each time, and follow a certain mathematical formula to change the height and speed.
Before the fuel is used up, make sure to land and keep the speed below 10m/s, so as to safely landing and win the game.

## code：

```python
import re

ALTITUDE = 100
VELOCITY = 10
FUEL = 1000
STEP = 0


def match(regex, raw_str):
    if re.match(regex, raw_str) is not None:
        return True
    return False


def yes(y_str):
    return match("[yY].*", y_str)


def no(n_str):
    return match("[nN].*", n_str)


def set_integer(param_name):
    while True:
        try:
            value = input("Enter the initial {}".format(param_name))
            value = int(value)
            if value <= 0:
                print(param_name, "must be positive")
            else:
                return value
        except ValueError as e:
            print("Please enter an integer")


class LunarLander:
    def __init__(self):
        self.altitude = ALTITUDE
        self.velocity = VELOCITY
        self.fuel = FUEL
        self.step = STEP

    def run(self):
        self.__game__()
        self.__init__()  # ???
        while True:
            play = input("Whether play again:(y/n)")
            if yes(play):
                self.__game__()
            elif no(play):
                break

    def __game__(self):
        self.__intro__()

        reset = input("Reset parameters?(y/n)")

        if yes(reset):
            self.set_params()

        while self.altitude > 0:
            consumed_fuel = self.consume_fuel()

            self.fuel = self.fuel - consumed_fuel
            self.velocity = self.velocity + 1.6 - consumed_fuel * 0.15
            self.altitude = self.altitude - self.velocity
            self.step = self.step + 1

            print("[Current State]", self.fuel, self.velocity, self.altitude, self.step)

        self.__print_result__()

    def consume_fuel(self):
        if self.fuel == 0:
            return 0

        while True:
            try:
                fuel = input("Enter the fuel to use:")
                fuel = int(fuel)

                if fuel < 0:
                    print("Fuel cannot be negative.")
                elif fuel > self.fuel:
                    print("Not enough fuel. Max fuel:", self.fuel)
                else:
                    break
            except ValueError as e:
                print("Please enter an integer.")
        return fuel

    def __intro__(self):
        print("Welcome to Lunar Lander")
        print("Altitude is", self.altitude, "meters.")
        print("Velocity is", self.velocity, "meters/second.")
        print("Fuel amount is", self.fuel, "liters.")

    def __print_result__(self):
        result = "Safe" if self.velocity < 10 else "Not safe"
        print(result, "landing.")
        print("Velocity:", self.velocity)
        print("Duration:", self.step)
        print("Left fuel:", self.fuel)

    def set_params(self):
        self.altitude = set_integer("altitude")
        self.velocity = set_integer("velocity")
        self.fuel = set_integer("fuel")


lunar_lander = LunarLander()

lunar_lander.run()
```
