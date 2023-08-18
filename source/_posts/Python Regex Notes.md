---
title: python-Regex Notes
categories: [tech]
---

Python comes with a built-in regular expression library re.

For strings that conform to certain textual patterns (such as dates, phone numbers, or ID numbers), you can design a regex matching rule to extract key information from the text.

In the regex matching rule, we abstract the expression of each character to derive the general form of the text.

At its simplest, to find the term "python" in a string, you can write:

```python
import re

line = "Python is the best language around the world! (I don't agree on that!)"

regex_expr = "Python"

if re.match(regex_expr, line):
    # "Yes"
    print("Yes")
```

***

## Special Chars

Regular expressions have built-in special characters to match a broader range of terms, such as:

- `\d` matches any digit
- `.` matches any single character
- `*` repeats the previous regex match any number of times

```python
regex_expr = ".*\d\d\d\d"
line = "I was born in 1998."
```

Other special characters are not further elaborated. If forgotten, refer to: https://www.runoob.com/regexp/regexp-syntax.html 💥

Sometimes, a series of consecutive characters have the same regex expression. To simplify, you can use `{}`.

In the above example, to match a 4-digit year, we used `\d\d\d\d`. With curly brakets, it can be simplified to:

```python
\d{4}
```
Sometimes, a character may have multiple styles.

For example, a certain character might be 'a', 'b', or 'c'. You can use `[]` to simplify the expression:

```python
[abc]
```

`[]` has some inherent expressions:
-  `[0-9]` is equivalent to `\d`
-  `[a-z]` matches any lowercase letter
-  `[.*?]` Punctuation within square brackets has no special meaning, but ^ inside square brackets indicates negation 😡

***

## Greedy Matching

Regex matches from left to right and will try to match as many fields as possible according to each segment of the rule. For example:

```python
line = "qeileeeeeeenn"
regex_expr = ".*(e.+en).*"
```
It will match `eeen` because `qeileeee` was greedily matched by `.*`.

You can use `?` for non-greedy matching, like:

```python
regex_expr = ".*?(e.+en).*"
```

This will match `eileeeeeeen`.

***

## Practical Examples

```python
import re

line = "XXX was born on September 24, 1998"
line2 = "XXX was born on 1998-9-24"
line3 = "XXX was born on 1998-09-24"
line4 = "XXX was born on 1998-09"
line5 = "XXX was born in September 1998"

# This would only match with line 3
regex_str3 = r"XXX was born on (\d{4})-(\d{2})-(\d{2})"

# Test the pattern against 'line3'
match_obj = re.match(regex_str3, line3)
if match_obj:
    print(match_obj.group(1))
    print(match_obj.group(2))
    print(match_obj.group(3))
else:
    print("No match found")

# Output
1998
09
24
```
