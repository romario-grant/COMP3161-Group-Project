import os
import random
from datetime import datetime, timedelta
from collections import defaultdict
from faker import Faker

fake = Faker()
random.seed(42)
Faker.seed(42)

# =========================================================
# CONFIG / ASSUMPTIONS
# =========================================================

NUM_STUDENTS    = 100_000
NUM_LECTURERS   = 50
NUM_ADMINS      = 10
NUM_COURSES     = 200

MIN_COURSES_PER_LECTURER = 1
MAX_COURSES_PER_LECTURER = 5

MIN_COURSES_PER_STUDENT  = 3
MAX_COURSES_PER_STUDENT  = 6

MIN_STUDENTS_PER_COURSE  = 10

MIN_SECTIONS_PER_COURSE  = 5
MAX_SECTIONS_PER_COURSE  = 12

MIN_CONTENT_PER_SECTION  = 2
MAX_CONTENT_PER_SECTION  = 8

THREADS_PER_FORUM_MIN    = 10
THREADS_PER_FORUM_MAX    = 80

ASSIGNMENTS_PER_COURSE_MIN = 3
ASSIGNMENTS_PER_COURSE_MAX = 6

SUBMISSION_RATE = 0.85
GRADED_RATE     = 0.90

CAL_EVENTS_PER_COURSE_MIN = 5
CAL_EVENTS_PER_COURSE_MAX = 20

BATCH_SIZE  = 1000
OUTPUT_DIR  = "generated_sql"
COMBINED_OUTPUT_FILE = "all_generated_data.sql"

FIXED_PASSWORD_HASH = "$2b$12$abcdefghijklmnopqrstuv"  # replace with a real bcrypt hash

SEMESTER_START = datetime(2026, 1, 12,  8,  0, 0)
SEMESTER_END   = datetime(2026, 5,  8, 23, 59, 59)

# ── Matching up the SQL ENUM values ──────────────────────────────────

# course_content.content_type ENUM('link', 'file', 'slide', 'video')
CONTENT_TYPES = ("link", "file", "slide", "video")

# calendar_event.event_type ENUM('lecture', 'tutorial', 'lab', 'exam')
EVENT_TYPES = ("lecture", "tutorial", "lab", "exam")

# submissions.submission_status ENUM('submitted', 'late', 'missing', 'graded')
SUBMISSION_STATUSES = ("submitted", "late")

TOTAL_MARK_OPTIONS = (20, 50, 100)

# =========================================================
# HELPER FUNCTIONS
# =========================================================

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def sql_escape(value: str) -> str:
    if value is None:
        return ""
    return str(value).replace("\\", "\\\\").replace("'", "''")

def sql_value(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
    return f"'{sql_escape(value)}'"

def write_insert_batch(file_handle, table_name, columns, rows):
    if not rows:
        return
    file_handle.write(f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES\n")
    for i, row in enumerate(rows):
        row_sql = "(" + ", ".join(sql_value(v) for v in row) + ")"
        if i < len(rows) - 1:
            file_handle.write(row_sql + ",\n")
        else:
            file_handle.write(row_sql + ";\n\n")

def chunked(iterable, size):
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk

def random_datetime(start_dt: datetime, end_dt: datetime) -> datetime:
    delta_seconds = int((end_dt - start_dt).total_seconds())
    offset = random.randint(0, max(0, delta_seconds))
    return start_dt + timedelta(seconds=offset)

def weighted_reply_count():
    r = random.random()
    if r < 0.70:
        return random.randint(1, 3)
    if r < 0.95:
        return random.randint(4, 10)
    return random.randint(20, 50)

def gaussian_score(total_marks):
    raw = random.gauss(mu=0.65 * total_marks, sigma=0.18 * total_marks)
    return max(0, min(total_marks, round(raw, 2)))

def course_code_generator():
    prefixes = ["COMP", "MATH", "INFO", "STAT", "DATA", "SOFT",
                "NETW", "CYBR", "DBMS", "ENGR"]
    used = set()
    while True:
        code = f"{random.choice(prefixes)}{random.randint(1000, 4999)}"
        if code not in used:
            used.add(code)
            yield code

# =========================================================
# IN-MEMORY STATE
# =========================================================

student_ids  = []
lecturer_ids = []
admin_ids    = []

course_codes      = []
section_ids       = []
forum_ids         = []
thread_ids        = []
assignment_ids    = []
submission_ids    = []

course_to_lecturer    = {}
lecturer_to_courses   = defaultdict(list)
course_to_students    = defaultdict(set)
student_to_courses    = defaultdict(set)
course_to_sections    = defaultdict(list)
section_to_course     = {}
course_to_forum       = {}
forum_to_course       = {}
thread_to_forum       = {}
thread_to_course      = {}
thread_to_creator     = {}
course_to_assignments = defaultdict(list)
assignment_to_course  = {}
assignment_due_dates  = {}
assignment_total_marks = {}
submission_to_assignment = {}
submission_to_student    = {}

# =========================================================
# GENERATORS
# =========================================================

def generate_users_and_roles():
    """
    users(user_id, email, password_hash, role, full_name, created_at)
    students(student_id)          ← student_id IS the user_id (single-column PK/FK)
    lecturers(lecturer_id)        ← same pattern
    admins(admin_id)              ← same pattern
    """
    user_id_counter = 1

    users_path = os.path.join(OUTPUT_DIR, "01_users.sql")
    roles_path = os.path.join(OUTPUT_DIR, "02_roles.sql")

    # Column lists that match the SQL schema exactly
    user_columns     = ["user_id", "email", "password_hash", "role", "full_name", "created_at"]
    # FIX: subtype tables have only ONE column each (the id = the user_id FK)
    student_columns  = ["student_id"]
    lecturer_columns = ["lecturer_id"]
    admin_columns    = ["admin_id"]

    with open(users_path, "w", encoding="utf-8") as uf, \
         open(roles_path, "w", encoding="utf-8") as rf:

        lecturer_rows = []
        user_rows     = []

        # ── Lecturers ──────────────────────────────────────────────────────
        for i in range(1, NUM_LECTURERS + 1):
            uid = user_id_counter
            user_id_counter += 1

            lecturer_ids.append(uid)
            user_rows.append((
                uid,
                f"lecturer{i}@university.edu",
                FIXED_PASSWORD_HASH,
                "lecturer",
                fake.name(),
                random_datetime(SEMESTER_START - timedelta(days=200), SEMESTER_START),
            ))
            # FIX: only insert the id — no separate user_id column
            lecturer_rows.append((uid,))

            if len(user_rows)     >= BATCH_SIZE:
                write_insert_batch(uf, "users",     user_columns,     user_rows);     user_rows.clear()
            if len(lecturer_rows) >= BATCH_SIZE:
                write_insert_batch(rf, "lecturers", lecturer_columns, lecturer_rows); lecturer_rows.clear()

        # ── Admins ─────────────────────────────────────────────────────────
        admin_rows = []
        for i in range(1, NUM_ADMINS + 1):
            uid = user_id_counter
            user_id_counter += 1

            admin_ids.append(uid)
            user_rows.append((
                uid,
                f"admin{i}@university.edu",
                FIXED_PASSWORD_HASH,
                "admin",
                fake.name(),
                random_datetime(SEMESTER_START - timedelta(days=200), SEMESTER_START),
            ))
            admin_rows.append((uid,))

            if len(user_rows)  >= BATCH_SIZE:
                write_insert_batch(uf, "users",  user_columns,  user_rows);  user_rows.clear()
            if len(admin_rows) >= BATCH_SIZE:
                write_insert_batch(rf, "admins", admin_columns, admin_rows); admin_rows.clear()

        # ── Students ───────────────────────────────────────────────────────
        student_rows = []
        for i in range(1, NUM_STUDENTS + 1):
            uid = user_id_counter
            user_id_counter += 1

            student_ids.append(uid)
            user_rows.append((
                uid,
                f"student{i}@university.edu",
                FIXED_PASSWORD_HASH,
                "student",
                fake.name(),
                random_datetime(SEMESTER_START - timedelta(days=300), SEMESTER_START),
            ))
            student_rows.append((uid,))

            if len(user_rows)    >= BATCH_SIZE:
                write_insert_batch(uf, "users",    user_columns,    user_rows);    user_rows.clear()
            if len(student_rows) >= BATCH_SIZE:
                write_insert_batch(rf, "students", student_columns, student_rows); student_rows.clear()

        # Flush remaining
        write_insert_batch(uf, "users",     user_columns,     user_rows)
        write_insert_batch(rf, "lecturers", lecturer_columns, lecturer_rows)
        write_insert_batch(rf, "admins",    admin_columns,    admin_rows)
        write_insert_batch(rf, "students",  student_columns,  student_rows)


def generate_courses():
    """ From schema:

    courses(course_code, course_title, lecturer_id, course_description)
    FIX: renamed course_name → course_title; removed created_at (not in schema);
         added course_description.
    """
    course_path    = os.path.join(OUTPUT_DIR, "03_courses.sql")
    # FIX: column names match SQL exactly
    course_columns = ["course_code", "course_title", "lecturer_id", "course_description"]

    code_gen = course_code_generator()

    # Guarantee each lecturer gets at least 1 course
    lecturer_loads = {lid: 0 for lid in lecturer_ids}
    assignments_list = list(lecturer_ids)               # one course per lecturer
    for lid in assignments_list:
        lecturer_loads[lid] += 1

    remaining = NUM_COURSES - len(assignments_list)
    while remaining > 0:
        eligible = [lid for lid in lecturer_ids if lecturer_loads[lid] < MAX_COURSES_PER_LECTURER]
        lid = random.choice(eligible)
        assignments_list.append(lid)
        lecturer_loads[lid] += 1
        remaining -= 1

    random.shuffle(assignments_list)

    rows = []
    with open(course_path, "w", encoding="utf-8") as f:
        for lecturer_id in assignments_list:
            code  = next(code_gen)
            title = (f"{fake.word().title()} {fake.word().title()} "
                     f"{random.choice(['Systems','Foundations','Design','Theory','Applications'])}")
            desc  = fake.paragraph(nb_sentences=2)

            course_codes.append(code)
            course_to_lecturer[code] = lecturer_id
            lecturer_to_courses[lecturer_id].append(code)

            rows.append((code, title, lecturer_id, desc))

            if len(rows) >= BATCH_SIZE:
                write_insert_batch(f, "courses", course_columns, rows); rows.clear()

        write_insert_batch(f, "courses", course_columns, rows)


def generate_enrollments():
    """
    enrollments(student_id, course_code, enrolled_date)
    """
    enrollment_path    = os.path.join(OUTPUT_DIR, "04_enrollments.sql")
    enrollment_columns = ["student_id", "course_code", "enrolled_date"]

    # Phase 1: guarantee MIN_STUDENTS_PER_COURSE per course
    all_students = student_ids[:]
    random.shuffle(all_students)
    student_index = 0
    for course_code in course_codes:
        for _ in range(MIN_STUDENTS_PER_COURSE):
            if student_index >= len(all_students):
                student_index = 0
                random.shuffle(all_students)
            sid = all_students[student_index]
            student_index += 1
            course_to_students[course_code].add(sid)
            student_to_courses[sid].add(course_code)

    # Phase 2: bring each student to 3-6 courses
    for sid in student_ids:
        target  = random.randint(MIN_COURSES_PER_STUDENT, MAX_COURSES_PER_STUDENT)
        current = student_to_courses[sid]
        if len(current) >= target:
            continue
        available = [c for c in course_codes if c not in current]
        needed    = target - len(current)
        for code in random.sample(available, needed):
            course_to_students[code].add(sid)
            student_to_courses[sid].add(code)

    rows = []
    with open(enrollment_path, "w", encoding="utf-8") as f:
        for sid in student_ids:
            for code in student_to_courses[sid]:
                enrolled_date = random_datetime(
                    SEMESTER_START - timedelta(days=14),
                    SEMESTER_START + timedelta(days=21)
                )
                rows.append((sid, code, enrolled_date))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "enrollments", enrollment_columns, rows); rows.clear()
        write_insert_batch(f, "enrollments", enrollment_columns, rows)


def generate_sections():
    """
    sections(section_id, course_code, title, order_index)
    description is optional/nullable — omitted here.
    """
    section_path    = os.path.join(OUTPUT_DIR, "05_sections.sql")
    section_columns = ["section_id", "course_code", "title", "order_index"]

    next_section_id = 1
    rows = []
    with open(section_path, "w", encoding="utf-8") as f:
        for code in course_codes:
            num = random.randint(MIN_SECTIONS_PER_COURSE, MAX_SECTIONS_PER_COURSE)
            for order_index in range(1, num + 1):
                sid = next_section_id
                next_section_id += 1
                title = f"Section {order_index}: {fake.sentence(nb_words=4).rstrip('.')}"
                section_ids.append(sid)
                course_to_sections[code].append(sid)
                section_to_course[sid] = code
                rows.append((sid, code, title, order_index))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "sections", section_columns, rows); rows.clear()
        write_insert_batch(f, "sections", section_columns, rows)


def generate_course_content():
    """
    course_content(content_id, course_code, section_id, lecturer_id,
                   title, content_type, content_url, date_uploaded)
    FIX: added course_code (NOT NULL in schema); renamed created_at → date_uploaded;
         CONTENT_TYPES restricted to SQL ENUM values ('link','file','slide','video').
    """
    content_path    = os.path.join(OUTPUT_DIR, "06_course_content.sql")
    content_columns = [
        "content_id", "course_code", "section_id", "lecturer_id",
        "title", "content_type", "content_url", "date_uploaded"
    ]

    next_id = 1
    rows = []
    with open(content_path, "w", encoding="utf-8") as f:
        for section_id in section_ids:
            code        = section_to_course[section_id]
            lecturer_id = course_to_lecturer[code]
            num         = random.randint(MIN_CONTENT_PER_SECTION, MAX_CONTENT_PER_SECTION)
            for _ in range(num):
                cid          = next_id; next_id += 1
                content_type = random.choice(CONTENT_TYPES)   # FIX: valid ENUM values only
                title        = fake.sentence(nb_words=5).rstrip(".")
                url          = f"https://lms.example.edu/content/{cid}"
                uploaded_at  = random_datetime(SEMESTER_START - timedelta(days=7), SEMESTER_END)
                rows.append((cid, code, section_id, lecturer_id, title, content_type, url, uploaded_at))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "course_content", content_columns, rows); rows.clear()
        write_insert_batch(f, "course_content", content_columns, rows)


def generate_calendar_events():
    """
    calendar_event(event_id, course_code, lecturer_id, title,
                   event_type, start_date, end_date, description)
    FIX: renamed start_time → start_date, end_time → end_date;
         removed 'location' (column does not exist in schema);
         EVENT_TYPES restricted to SQL ENUM ('lecture','tutorial','lab','exam').
    """
    event_path    = os.path.join(OUTPUT_DIR, "07_calendar_events.sql")
    event_columns = [
        "event_id", "course_code", "lecturer_id", "title",
        "event_type", "start_date", "end_date", "description"
    ]

    next_id = 1
    rows = []
    with open(event_path, "w", encoding="utf-8") as f:
        for code in course_codes:
            lecturer_id = course_to_lecturer[code]
            num         = random.randint(CAL_EVENTS_PER_COURSE_MIN, CAL_EVENTS_PER_COURSE_MAX)
            for _ in range(num):
                eid        = next_id; next_id += 1
                event_type = random.choice(EVENT_TYPES)        # FIX: valid ENUM values only
                title      = f"{event_type.title()} – {fake.sentence(nb_words=3).rstrip('.')}"
                start_date = random_datetime(SEMESTER_START, SEMESTER_END - timedelta(hours=2))
                end_date   = start_date + timedelta(hours=random.choice([1, 2, 3]))
                description = fake.sentence(nb_words=8)
                rows.append((eid, code, lecturer_id, title, event_type, start_date, end_date, description))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "calendar_event", event_columns, rows); rows.clear()
        write_insert_batch(f, "calendar_event", event_columns, rows)


def generate_forums():
    """
    discussion_forum(forum_id, course_code, title, description, date_created)
    FIX: renamed created_at → date_created; added description.
    """
    forum_path    = os.path.join(OUTPUT_DIR, "08_forums.sql")
    forum_columns = ["forum_id", "course_code", "title", "description", "date_created"]

    next_id = 1
    rows = []
    with open(forum_path, "w", encoding="utf-8") as f:
        for code in course_codes:
            fid         = next_id; next_id += 1
            title       = f"{code} Discussion Forum"
            description = fake.sentence(nb_words=6)
            date_created = random_datetime(
                SEMESTER_START - timedelta(days=2),
                SEMESTER_START + timedelta(days=5)
            )
            forum_ids.append(fid)
            course_to_forum[code] = fid
            forum_to_course[fid]  = code
            rows.append((fid, code, title, description, date_created))
            if len(rows) >= BATCH_SIZE:
                write_insert_batch(f, "discussion_forum", forum_columns, rows); rows.clear()
        write_insert_batch(f, "discussion_forum", forum_columns, rows)


def generate_threads():
    """
    discussion_thread(thread_id, forum_id, title, initial_post, user_id, date_created)
    FIX: renamed created_by → user_id; renamed body → initial_post;
         renamed created_at → date_created.
    """
    thread_path    = os.path.join(OUTPUT_DIR, "09_threads.sql")
    thread_columns = ["thread_id", "forum_id", "title", "initial_post", "user_id", "date_created"]

    next_id = 1
    rows = []
    with open(thread_path, "w", encoding="utf-8") as f:
        for fid in forum_ids:
            code              = forum_to_course[fid]
            lecturer_id       = course_to_lecturer[code]
            enrolled_students = list(course_to_students[code])
            num               = random.randint(THREADS_PER_FORUM_MIN, THREADS_PER_FORUM_MAX)
            for _ in range(num):
                tid          = next_id; next_id += 1
                user_id      = (random.choice(enrolled_students)
                                if random.random() < 0.85 and enrolled_students
                                else lecturer_id)
                title        = fake.sentence(nb_words=6).rstrip(".")
                initial_post = fake.paragraph(nb_sentences=3)
                date_created = random_datetime(SEMESTER_START, SEMESTER_END)
                thread_ids.append(tid)
                thread_to_forum[tid]   = fid
                thread_to_course[tid]  = code
                thread_to_creator[tid] = user_id
                rows.append((tid, fid, title, initial_post, user_id, date_created))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "discussion_thread", thread_columns, rows); rows.clear()
        write_insert_batch(f, "discussion_thread", thread_columns, rows)


def generate_replies():
    """
    replies(reply_id, thread_id, parent_reply_id, user_id, body, date_created)
    Column order matches SQL schema.
    """
    reply_path    = os.path.join(OUTPUT_DIR, "10_replies.sql")
    reply_columns = ["reply_id", "thread_id", "parent_reply_id", "user_id", "body", "date_created"]

    next_id = 1
    rows = []
    with open(reply_path, "w", encoding="utf-8") as f:
        for tid in thread_ids:
            code              = thread_to_course[tid]
            lecturer_id       = course_to_lecturer[code]
            enrolled_students = list(course_to_students[code])
            num_replies       = weighted_reply_count()
            replies_in_thread = []
            for i in range(num_replies):
                rid     = next_id; next_id += 1
                user_id = (random.choice(enrolled_students)
                           if random.random() < 0.9 and enrolled_students
                           else lecturer_id)
                parent  = (None if i == 0 or not replies_in_thread or random.random() < 0.70
                           else random.choice(replies_in_thread))
                body         = fake.paragraph(nb_sentences=random.randint(1, 3))
                date_created = random_datetime(SEMESTER_START, SEMESTER_END)
                replies_in_thread.append(rid)
                rows.append((rid, tid, parent, user_id, body, date_created))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "replies", reply_columns, rows); rows.clear()
        write_insert_batch(f, "replies", reply_columns, rows)


def generate_assignments():
    """
    assignments(assignment_id, course_code, title, description, total_marks, due_date)
    FIX: removed created_at (column does not exist in schema).
    """
    assignment_path    = os.path.join(OUTPUT_DIR, "11_assignments.sql")
    assignment_columns = ["assignment_id", "course_code", "title", "description", "total_marks", "due_date"]

    next_id = 1
    rows = []
    with open(assignment_path, "w", encoding="utf-8") as f:
        for code in course_codes:
            num = random.randint(ASSIGNMENTS_PER_COURSE_MIN, ASSIGNMENTS_PER_COURSE_MAX)
            for idx in range(1, num + 1):
                aid         = next_id; next_id += 1
                due_date    = random_datetime(
                    SEMESTER_START + timedelta(days=14),
                    SEMESTER_END   - timedelta(days=7)
                )
                title       = f"Assignment {idx}"
                description = fake.paragraph(nb_sentences=2)
                total_marks = random.choice(TOTAL_MARK_OPTIONS)
                assignment_ids.append(aid)
                course_to_assignments[code].append(aid)
                assignment_to_course[aid]   = code
                assignment_due_dates[aid]   = due_date
                assignment_total_marks[aid] = total_marks
                rows.append((aid, code, title, description, total_marks, due_date))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "assignments", assignment_columns, rows); rows.clear()
        write_insert_batch(f, "assignments", assignment_columns, rows)


def generate_submissions():
    """
    submissions(submission_id, assignment_id, student_id,
                submission_time, file_url, text_answer, submission_status)
    FIX: renamed submitted_at → submission_time; status → submission_status;
         submission_url → file_url; text_answer added as NULL (file_url provided).
    """
    submission_path    = os.path.join(OUTPUT_DIR, "12_submissions.sql")
    submission_columns = [
        "submission_id", "assignment_id", "student_id",
        "submission_time", "file_url", "text_answer", "submission_status"
    ]

    next_id = 1
    rows = []
    with open(submission_path, "w", encoding="utf-8") as f:
        for aid in assignment_ids:
            code     = assignment_to_course[aid]
            due_date = assignment_due_dates[aid]
            for sid in course_to_students[code]:
                if random.random() > SUBMISSION_RATE:
                    continue
                sub_id = next_id; next_id += 1
                if random.random() < 0.82:
                    submission_time = due_date - timedelta(
                        days=random.randint(0, 7), hours=random.randint(0, 23))
                    status = "submitted"
                else:
                    submission_time = due_date + timedelta(
                        days=random.randint(1, 5), hours=random.randint(0, 23))
                    status = "late"
                if submission_time < SEMESTER_START:
                    submission_time = SEMESTER_START + timedelta(days=random.randint(0, 10))
                file_url = f"https://lms.example.edu/submissions/{sub_id}"
                submission_ids.append(sub_id)
                submission_to_assignment[sub_id] = aid
                submission_to_student[sub_id]    = sid
                # text_answer is NULL (file_url satisfies the CHECK constraint)
                rows.append((sub_id, aid, sid, submission_time, file_url, None, status))
                if len(rows) >= BATCH_SIZE:
                    write_insert_batch(f, "submissions", submission_columns, rows); rows.clear()
        write_insert_batch(f, "submissions", submission_columns, rows)


def generate_grades():
    """
    grades(grade_id, submission_id, graded_by_lecturer_id, score)
    FIX: renamed lecturer_id → graded_by_lecturer_id;
         removed feedback and graded_at (columns do not exist in schema).
    """
    grade_path    = os.path.join(OUTPUT_DIR, "13_grades.sql")
    grade_columns = ["grade_id", "submission_id", "graded_by_lecturer_id", "score"]

    next_id = 1
    rows = []
    with open(grade_path, "w", encoding="utf-8") as f:
        for sub_id in submission_ids:
            if random.random() > GRADED_RATE:
                continue
            aid         = submission_to_assignment[sub_id]
            code        = assignment_to_course[aid]
            lecturer_id = course_to_lecturer[code]
            total_marks = assignment_total_marks[aid]
            gid         = next_id; next_id += 1
            score       = gaussian_score(total_marks)
            rows.append((gid, sub_id, lecturer_id, score))
            if len(rows) >= BATCH_SIZE:
                write_insert_batch(f, "grades", grade_columns, rows); rows.clear()
        write_insert_batch(f, "grades", grade_columns, rows)


# =========================================================
# MAIN
# =========================================================

def print_summary():
    total_enrollments = sum(len(v) for v in student_to_courses.values())
    print("\nGeneration complete.")
    print(f"  Students:     {len(student_ids):>10,}")
    print(f"  Lecturers:    {len(lecturer_ids):>10,}")
    print(f"  Admins:       {len(admin_ids):>10,}")
    print(f"  Courses:      {len(course_codes):>10,}")
    print(f"  Enrollments:  {total_enrollments:>10,}")
    print(f"  Sections:     {len(section_ids):>10,}")
    print(f"  Forums:       {len(forum_ids):>10,}")
    print(f"  Threads:      {len(thread_ids):>10,}")
    print(f"  Assignments:  {len(assignment_ids):>10,}")
    print(f"  Submissions:  {len(submission_ids):>10,}")

def combine_generated_sql():
    ordered_files = [
        "01_users.sql",
        "02_roles.sql",
        "03_courses.sql",
        "04_enrollments.sql",
        "05_sections.sql",
        "06_course_content.sql",
        "07_calendar_events.sql",
        "08_forums.sql",
        "09_threads.sql",
        "10_replies.sql",
        "11_assignments.sql",
        "12_submissions.sql",
        "13_grades.sql",
    ]

    with open(COMBINED_OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        outfile.write("USE course_mgmt;\n\n")
        for filename in ordered_files:
            path = os.path.join(OUTPUT_DIR, filename)
            outfile.write(f"-- {filename}\n")
            with open(path, "r", encoding="utf-8") as infile:
                outfile.write(infile.read())
            outfile.write("\n")

def main():
    ensure_output_dir()
    print("1.  Generating users and role tables..."); generate_users_and_roles()
    print("2.  Generating courses...");               generate_courses()
    print("3.  Generating enrollments...");           generate_enrollments()
    print("4.  Generating sections...");              generate_sections()
    print("5.  Generating course content...");        generate_course_content()
    print("6.  Generating calendar events...");       generate_calendar_events()
    print("7.  Generating forums...");                generate_forums()
    print("8.  Generating threads...");               generate_threads()
    print("9.  Generating replies...");               generate_replies()
    print("10. Generating assignments...");           generate_assignments()
    print("11. Generating submissions...");           generate_submissions()
    print("12. Generating grades...");                generate_grades()
    print("13. Combining generated SQL...");          combine_generated_sql()
    print_summary()

if __name__ == "__main__":
    main()
