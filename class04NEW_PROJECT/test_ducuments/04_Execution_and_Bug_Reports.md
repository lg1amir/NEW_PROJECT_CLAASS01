# דוח תוצאות הרצה ודיווחי באגים (Execution & Bug Reports)
## מערכת: Test Data Generator & Store
**גרסה:** 1.0  
**תאריך בדיקה:** 11 נובמבר 2026  
**סביבת בדיקה:** Windows 11 Enterprise | Python 3.13.0 64-bit | PowerShell  
**סטטוס כללי:** 🔴 **נמצאו תקלות קריטיות (Blockers) ובאג השחתת נתונים שקט (Silent Bug)**

---

## 1. סיכום הרצת בדיקות (Execution Summary)

| סוג בדיקה | סך תרחישים | עברו (Passed) | נכשלו (Failed) | חסומים (Blocked) | אחוז הצלחה |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **יחידה ואלגוריתמיקה (`run_tests.py`)** | 78 | 78 | 0 | 0 | 100% |
| **אינטגרציה ו-CLI End-to-End** | 18 | 13 | 4 | 1 | 72.2% |
| **שכבת קבצים ו-Storage Validation** | 6 | 4 | 2 | 0 | 66.6% |
| **סה"כ** | **102** | **95** | **6** | **1** | **93.1%** |

### פירוט סוויטת הבדיקות הפנימית (`run_tests.py`):
- **Suite 1 (validate_count - 24 tests):** כל מקרי הקצה של אימות קלט כמות עברו (0, שליליים, מחרוזות, שברים, מעל 100K).
- **Suite 2 (validate_field_choices - 29 tests):** כל מקרי הקצה של בחירת שדות עברו (שדות שגויים, כפילויות, רווחים).
- **Suite 3 (TestDataGenerator - 11 tests):** ייחודיות של שמות, מיילים, טלפונים ותעודות זהות עברה במלואה.
- **Suite 4 (Storage Layer - 10 tests):** שמירה, טעינה, קידוד UTF-8-BOM ומצבי Overwrite/Append בסיסיים עברו.
- **Suite 5 (Israeli ID / Luhn - 4 tests):** אלגוריתם Luhn אומת מול 500 תעודות זהות ומספרי בדיקה ידועים.

---

## 2. דוחות באגים רשמיים (Official Bug Reports)

---

### 🐛 Bug Report #1: שגיאת תחביר (SyntaxError) מונעת את הפעלת התוכנה לחלוטין
- **Bug ID:** `BUG-CLI-001`
- **חומרה (Severity):** 🔴 **Blocker (קריטי)**
- **עדיפות (Priority):** P1 - דחוף ביותר
- **רכיב:** `class04NEW_PROJECT/main.py` (שורה 3)
- **כותרת:** `SyntaxError: invalid syntax` בקובץ `main.py` עקב תו שגוי לפני ה-Docstring.

#### תיאור התקלה:
בעת ניסיון להפעיל את האפליקציה כפי שמתועד ב-`README.md` (`python main.py`), מפרש הפייתון קורס מיד עם שגיאת תחביר. התוכנה אינה מתחילה לרוץ כלל.

#### צעדים לשחזור (Steps to Reproduce):
1. פתח מסוף בנתיב: `c:\Users\user\Documents\MyProject\AiNative\class04NEW_PROJECT`.
2. הרץ את הפקודה: `python main.py`.

#### תוצאה מצופה (Expected Result):
האפליקציה תאתחל, תוודא את גרסת ה-Python ותציג את התפריט הראשי של המערכת.

#### תוצאה בפועל (Actual Result):
```text
  File "C:\Users\user\Documents\MyProject\AiNative\class04NEW_PROJECT\main.py", line 3
    2"""
     ^^^
SyntaxError: invalid syntax
```

#### ניתוח שורש ותיקון מוצע (Root Cause & Fix):
בשורה 3 של `main.py` מופיע התו המיותר `2` לפני המרכאות המשולשות של ה-Docstring:
```python
# קוד קיים שגוי:
2"""
main.py - Application Entry Point
"""

# תיקון נדרש:
"""
main.py - Application Entry Point
"""
```

---

### 🐛 Bug Report #2: מיקום שגוי של קובץ ממשק המשתמש (`cli.py`)
- **Bug ID:** `BUG-CLI-002`
- **חומרה (Severity):** 🔴 **Blocker (קריטי)**
- **עדיפות (Priority):** P1 - דחוף ביותר
- **רכיב:** מבנה תיקיות הפרויקט / Packaging
- **כותרת:** קובץ `cli.py` ממוקם בתיקיית האב ולא בתוך `class04NEW_PROJECT`, מה שגורם ל-`ModuleNotFoundError`.

#### תיאור התקלה:
קובץ `main.py` מייבא את מודול `cli` באמצעות `from cli import run_main_menu`. עם זאת, קובץ `cli.py` ממוקם ב-`AiNative/cli.py` ולא בתוך תיקיית הפרויקט `AiNative/class04NEW_PROJECT/cli.py`.
- בהרצה מתוך `class04NEW_PROJECT`: נזרקת שגיאה `ModuleNotFoundError: No module named 'cli'`.
- בהרצה ישירה של `cli.py` מתיקיית האב: נזרקת שגיאה `ModuleNotFoundError: No module named 'logic'` (כי `logic.py` נמצא בתיקיית הבת).

#### צעדים לשחזור (Steps to Reproduce):
1. תקן את שגיאת התחביר ב-`main.py`.
2. מתוך `class04NEW_PROJECT`, הרץ: `python main.py`.

#### תוצאה בפועל (Actual Result):
```text
Traceback (most recent call last):
  File "C:\Users\user\Documents\MyProject\AiNative\class04NEW_PROJECT\main.py", line 17, in <module>
    from cli import run_main_menu
ModuleNotFoundError: No module named 'cli'
```

#### תיקון מוצע (Fix):
יש להעתיק או להעביר את הקובץ `cli.py` מתיקיית `AiNative` לתוך תיקיית `class04NEW_PROJECT`.

---

### 🐛 Bug Report #3: השחתת נתונים שקטה במצב הוספת רשומות (CSV Append Schema Mismatch)
- **Bug ID:** `BUG-CLI-003`
- **חומרה (Severity):** 🟠 **Major (Silent Data Corruption)**
- **עדיפות (Priority):** P2 - גבוהה
- **רכיב:** `storage.py` (`save_records_to_csv`)
- **כותרת:** הוספת נתונים לקובץ CSV קיים שסכמת העמודות שלו שונה מזו של הבאצווה הנוכחית מובילה להצמדת ערכים לעמודות שגויות.

#### תיאור התקלה (Silent Bug):
במצב שמירה `append=True`, הקוד בודק האם הקובץ קיים ולא כותב Header חדש. אולם, הוא מייצר `csv.DictWriter` המוגדר עם ה-`fieldnames` של הרשומות הנוכחיות **בלבד**, במקום להסתמך על ה-Header הקיים בקובץ היעד. כתוצאה מכך, הערכים נכתבים החל מהעמודה הראשונה ללא תלות במשמעותם!

#### צעדים לשחזור (Steps to Reproduce):
1. הגדר כמות 1, בחר שדות `1, 2` (`full_name`, `email`), ייצר נתונים ושמור לקובץ `users.csv`.
   - נוצר קובץ עם Header: `full_name,email` ושורה: `Lior Cohen,lior.cohen123@gmail.com`.
2. שנה הגדרות: כמות 1, בחר שדה `3` בלבד (`phone`), ייצר נתונים.
3. שמור לאותו קובץ `users.csv` ובחר באפשרות הוספה: `yes` (Append).
4. צפה בתוכן הקובץ דרך אפשרות 5 או פתח את הקובץ ישירות.

#### תוצאה מצופה (Expected Result):
מספר הטלפון ייכתב תחת עמודת `phone`, או שהמערכת תדחה את פעולת ההוספה ותציג התראת Schema Mismatch.

#### תוצאה בפועל (Actual Result):
הקובץ נשמר ללא כל שגיאה, אך תוכן השורה שנוספה הוא:
```csv
full_name,email
Lior Cohen,lior.cohen123@gmail.com
050-1234567
```
בטעינת הקובץ מחדש, הנתונים מתפרשים כך:
```python
{'full_name': '050-1234567', 'email': None}
```
**מספר הטלפון הוכנס ישירות לתוך עמודת `full_name`! נוצר עיוות נתונים שקט ללא התראה.**

#### תיקון מוצע (Fix):
בפונקציה `save_records_to_csv`: אם `append=True` והקובץ קיים ולא ריק, יש לקרוא תחילה את שורת הכותרות המקורית של הקובץ (`with dest.open(...) as fh: original_fieldnames = list(csv.reader(fh))[0]`) ולהגדיר את ה-`DictWriter` לפי ה-`fieldnames` של הקובץ המקורי.

---

### 🐛 Bug Report #4: חוסר סנכרון מצב סשן (Stale Session State)
- **Bug ID:** `BUG-CLI-004`
- **חומרה (Severity):** 🟡 **Medium (Logic / UX Flaw)**
- **עדיפות (Priority):** P3 - בינונית
- **רכיב:** `cli.py` (`screen_set_count`, `screen_select_fields`, `SessionState`)
- **כותרת:** שינוי כמות רשומות או שדות אינו מנקה את הנתונים שיוצרו קודם, ומאפשר שמירת נתונים ישנים שאינם תואמים לתפריט המוצג.

#### תיאור התקלה:
כאשר המשתמש מייצר 100 רשומות, הנתונים נשמרים במשתנה `state._last_records`. אם לאחר מכן המשתמש חוזר לתפריט 1 ומשנה את הכמות ל-5 רשומות, בתפריט הראשי מוצג: `Record count : 5`.
אולם, אם המשתמש ניגש ישירות למסך 4 (Save), המערכת מודיעה: `100 records ready to save.` ושומרת את 100 הרשומות מההרצה הקודמת!

#### צעדים לשחזור (Steps to Reproduce):
1. קבע כמות 100 רשומות, בחר שדות, והפעל ייצור (אפשרות 3).
2. חזור לתפריט הראשי, בחר אפשרות 1 ושנה את הכמות ל-5.
3. בתפריט הראשי ודא שמוצג: `Record count : 5`.
4. בחר באפשרות 4 (Save Data to CSV).

#### תוצאה בפועל (Actual Result):
נשמרות 100 רשומות במקום 5 רשומות, ללא התראה למשתמש על כך שהנתונים שנשמרים שייכים לקונפיגורציה ישנה.

#### תיקון מוצע (Fix):
בפונקציות `screen_set_count` ו-`screen_select_fields`, בכל פעם שמתבצע עדכון מוצלח של הערך, יש להוסיף שורה המאפסת את המאגר הישן:
```python
state._last_records = None
```

---

### 🐛 Bug Report #5: סיומת כפולה בשמות קבצים עם `.CSV` באותיות גדולות
- **Bug ID:** `BUG-CLI-005`
- **חומרה (Severity):** 🟢 **Low / Minor**
- **עדיפות (Priority):** P4 - נמוכה
- **רכיב:** `cli.py` (שורה 302)
- **כותרת:** הזנת שם קובץ המסתיים ב-`.CSV` (אותיות גדולות) מובילה ליצירת סיומת כפולה `.CSV.csv`.

#### צעדים לשחזור (Steps to Reproduce):
1. ייצר נתונים ועבור למסך שמירה (4).
2. הזן שם קובץ: `output_data.CSV`.

#### תוצאה בפועל (Actual Result):
הקובץ נשמר בדיסק בשם: `output_data.CSV.csv`.

#### תיקון מוצע (Fix):
בשורה 302 של `cli.py`, יש לשנות את הבדיקה ל-Case Insensitive:
```python
# קוד קיים:
filename = raw_name if raw_name.endswith(".csv") else raw_name + ".csv"

# תיקון נדרש:
filename = raw_name if raw_name.lower().endswith(".csv") else raw_name + ".csv"
```

