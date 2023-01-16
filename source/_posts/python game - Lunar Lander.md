---
title: python game-Lunar Lander
---

## 游戏规则：

直接用python3跑。用户可以在游戏初始进入cheat model，更改默认值，重新设定起始高度、速度和油量，并正式进入游戏。输入每次选择使用的油量，会遵循一定的数学公式，改变高度和速度，在油量用完之前，保证落地并将速度维持在10m/s以下，即可完成safe landing赢得游戏。

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