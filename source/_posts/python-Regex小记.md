---
title: python-Regex小记
categories: [tech]
---

今天花了两个多小时初步实践了一下python regex应用.

python自带正则表达式库 `re`

对于符合某种文本样式的字符串(日期，电话号码，身份证号)，可以设计一个regex匹配规则，来提取文本中的关键信息。

在Regex匹配规则中，我们对每个字符的表达方式进行抽象，从而得出该文本的一般表现形式。

最简单的，在一个字符串中找出 `python` 字段，可以这么写
```python
import re

line = "Python is the best language around the world! (I don't agree on that!)"

regex_expr = "Python"

if re.match(regex_expr, line):
    # "Yes"
    print("Yes")
```

***

## 特殊字符
正则表达式具有自带的特殊字符，用来匹配更广泛的字段，例如:
- `\d` 可匹配任意数字
- `.` 匹配一位任意字符
- `*` 重复前一位正则匹配任意次数

```python
regex_expr = ".*\d\d\d\d"
line = "I was born in 1998."
```

其他特殊字符不再赘述,忘记就看https://www.runoob.com/regexp/regexp-syntax.html 💥

有时候，一串连续的字符具有相同的正则表达式，为了简化，可以使用 `{}`

在上述例子中，为了匹配4位数字的年份，使用了 `\d\d\d\d`， 通过大括号传入数字，可以简化为:
```python
\d{4}
```

有时候，一个字符可能存在多种样式，如某位字符可能是 'a' 或 'b' 或 'c'，可使用 `[]` 来简化表达:
```python
[abc]
```

`[]` 具有一些固有表达:
-  `[0-9]` 等价于 \d
-  `[a-z]` 匹配任意小写字母
-  `[.*?]` 标点在中括号中不在具备特殊意义，但是 `^` 在中括号中表示取反😡

***

## 贪婪匹配

regex从左到右匹配，会根据每一段规则尽可能匹配多的字段，例如
```python
line = "qeileeeeeeenn"
regex_expr = ".*(e.+en).*"
```
会匹配到 `eeen`,因为 `qeileeee`都被 `.*` 贪婪匹配掉了。

这时可以用 `?`反贪婪匹配，如
```python
regex_expr = ".*?(e.+en).*" 
```
就可以匹配到 `eileeeeeeen`。

***

## 实操案例
```python
import re

line = "XXX出生于1998年9月24日"
line2 = "XXX出生于1998-9-24"
line3 = "XXX出生于1998-09-24"
line4 = "XXX出生于1998-09"
line5 = "XXX出生于1998年9月"
regex_str2 = ".*出生于((\d{4}).(\d{1,2}).{0,1}((\d{1,2})|.*).*)"

match_obj = re.match(regex_str2, line)
print(match_obj.group(1))
print(match_obj.group(2))
print(match_obj.group(3))
print(match_obj.group(4))
```
***
**错误示范**
```python
import re
line = "XXX出生于1998年9月24日"
regex_str = ".*出生于(\d{4}[年/-]\d{1,2}([月/-]\d{1,2}|[月/-]$|$))"
match_obj = re.match(regex_str, line)
print(match_obj.group(1))
#你猜得出哪错了嘛？
```
(来自某慕课网高分网红课，差评😊)
