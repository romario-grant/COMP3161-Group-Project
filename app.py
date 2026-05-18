from flask import Flask, request, make_response, send_from_directory
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime

STATIC_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
CORS(app)

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "127.0.0.1"),
    "user":     os.environ.get("DB_USER",     "user_1"),
    "password": os.environ.get("DB_PASSWORD", "password876"),
    "database": os.environ.get("DB_NAME",     "course_mgmt"),
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


REPORT_VIEWS = {
    "courses_with_50": "Courses with 50 or more students",
    "students_overfive_courses": "Students enrolled in 5 or more courses",
    "lecturers_courses": "Lecturers teaching 3 or more courses",
    "most_enrolled_courses": "Top 10 most enrolled courses",
    "top_10_students_by_average": "Top 10 students by overall average",
}


def fetch_all_from_view(view_name):
    if view_name not in REPORT_VIEWS:
        return None

    cnx = get_db()
    cursor = cnx.cursor(dictionary=True)
    cursor.execute(f"SELECT * FROM {view_name}")
    rows = cursor.fetchall()
    cursor.close()
    cnx.close()
    return rows


@app.route('/register_user', methods=['POST'])

def register_user():
    try:
        data = request.get_json()

        cnx = get_db()
        cursor = cnx.cursor()
        values = (data['email'], data['password_hash'], data['role'], data['full_name'])
        cursor.execute('INSERT INTO users (email, password_hash, role, full_name) VALUES (%s, %s, %s, %s)', values)

        new_user_id = cursor.lastrowid  # ← grabs the auto-generated user_id

        role = data['role']
        if role == 'student':
            cursor.execute('INSERT INTO students (student_id) VALUES (%s)', (new_user_id,))
        elif role == 'lecturer':
            cursor.execute('INSERT INTO lecturers (lecturer_id) VALUES (%s)', (new_user_id,))
        elif role == 'admin':
            cursor.execute('INSERT INTO admins (admin_id) VALUES (%s)', (new_user_id,))
        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({'message': 'User registered successfully!'}, 201)
    
    except  Exception as e:
        return make_response({'error': str(e)}, 400)

@app.route('/users/<int:user_id>', methods=['GET'])

def user_login(user_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT * FROM users WHERE user_id = %s', (user_id,))
        user = cursor.fetchone()

        cursor.close()
        cnx.close()

        if user:
            return make_response(user, 200)
        else:
            return make_response({'error':'User not found'}, 404)

    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/login', methods=['POST'])
@app.route('/users/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password_hash = data.get('password_hash') or data.get('password')

        if not email or not password_hash:
            return make_response({'error': 'email and password_hash are required'}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT user_id, email, role, full_name, created_at
            FROM users
            WHERE email = %s AND password_hash = %s
            ''',
            (email, password_hash)
        )
        user = cursor.fetchone()
        cursor.close()
        cnx.close()

        if not user:
            return make_response({'error': 'Invalid email or password'}, 401)

        return make_response({'message': 'Login successful', 'user': user}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

@app.route('/create_course', methods=['POST'])

def create_course():
    try:
        data = request.get_json()
        
        user_id = data.get('user_id')

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT role FROM users WHERE user_id = %s', (user_id,))
        user = cursor.fetchone()

        if not user or user['role'] != 'admin':
            cursor.close()
            cnx.close()
            return make_response({'error': 'Only admins can create courses'}, 403)
        
        values = (data['course_code'], data['course_title'], data['lecturer_id'], data['course_description'])
        cursor.execute('INSERT INTO courses (course_code, course_title, lecturer_id, course_description) VALUES (%s, %s, %s, %s)', values)
        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({'message':'Course created successfully!'}, 201)

    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/courses', methods=['GET'])

def get_all_courses():
    try:
        cnx = get_db()
        cursor = cnx.cursor()
        cursor.execute('SELECT * FROM courses')
        course_list = []

        for course_code, course_title, lecturer_id, course_description in cursor:
            course = {}
            course ['course_code'] = course_code
            course ['course_title'] = course_title
            course ['lecturer_id'] = lecturer_id
            course ['course_description'] = course_description

            course_list.append(course)
        cursor.close()
        cnx.close()

        return make_response(course_list, 200)

    except Exception as e:
        return make_response ({'error':str(e)}, 400)


@app.route('/enrollments/<int:student_id>', methods=['GET'])

def get_student_courses(student_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT course_code FROM enrollments WHERE student_id = %s', (student_id,))
        student_courses = cursor.fetchall()

        cursor.close()
        cnx.close()

        if student_courses:
            return make_response({'student_id': student_id, 'courses': student_courses}, 200)
        else:
            return make_response({'error':'Courses not found for this student'}, 404)

    except Exception as e:
        return make_response({'error':str(e)}, 400)

@app.route('/courses/<int:lecturer_id>', methods=['GET'])

def get_lecturer_courses(lecturer_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT course_code, course_title FROM courses WHERE lecturer_id = %s', (lecturer_id,))
        lecturer_courses = cursor.fetchall()

        cursor.close()
        cnx.close()

        if lecturer_courses:
            return make_response({'lecturer_id': lecturer_id, 'courses': lecturer_courses}, 200)
        else:
            return make_response({'error':'Courses not found for this lecturer'}, 404)

    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/register_for_course', methods=['POST'])

def register_for_course():
    data = request.get_json()

    student_id = data.get('student_id')
    course_code = data.get('course_code')

    try:
        cnx = get_db()
        cursor = cnx.cursor()

        cursor.execute('SELECT COUNT(*) FROM enrollments WHERE student_id = %s', (student_id,))
        current_count = cursor.fetchone()[0]

        if current_count >= 6:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Students cannot enroll in more than 6 courses'}, 400)

        cursor.execute('INSERT INTO enrollments (student_id, course_code) VALUES (%s, %s)', (student_id, course_code))

        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({'message': 'Student registered for course!', 'enrollment_count': current_count + 1}, 201)
    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/enrollments/<course_code>', methods=['GET'])

def get_course_students(course_code):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute('SELECT u.user_id AS student_id, u.full_name FROM enrollments e JOIN students s ON e.student_id = s.student_id JOIN users u ON s.student_id = u.user_id WHERE e.course_code = %s', (course_code,))
        students = cursor.fetchall()


        

        cursor.close()
        cnx.close()

        return make_response({'course_code': course_code, 'students': students}, 200)

    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/calendar/create', methods=['POST'])
def create_event():
    try:
        data = request.get_json()
        cnx = get_db()
        cursor = cnx.cursor()
        
        query = """INSERT INTO calendar_event 
                   (course_code, lecturer_id, title, event_type, start_date, end_date, description) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        values = (data['course_code'], data['lecturer_id'], data['title'], 
                  data['event_type'], data['start_date'], data['end_date'], data['description'])
        
        cursor.execute(query, values)
        cnx.commit()
        cursor.close()
        cnx.close()
        return make_response({'message': 'Event created successfully!'}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Retrieves calendar events
@app.route('/calendar/course/<course_code>', methods=['GET'])
def get_course_events(course_code):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT * FROM calendar_event WHERE course_code = %s', (course_code,))
        events = cursor.fetchall()
        cursor.close()
        cnx.close()
        return make_response({'events': events}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Retrieves specific date events for student
@app.route('/calendar/student/<int:student_id>/<date>', methods=['GET'])
def get_student_daily_events(student_id, date):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
       
        query = """
            SELECT ce.* FROM calendar_event ce
            JOIN enrollments e ON ce.course_code = e.course_code
            WHERE e.student_id = %s AND DATE(ce.start_date) = %s
        """
        cursor.execute(query, (student_id, date))
        events = cursor.fetchall()
        cursor.close()
        cnx.close()
        return make_response({'events': events}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)                     


@app.route('/create_forum', methods=['POST'])
@app.route('/courses/<course_code>/forums', methods=['POST'])
def create_forum(course_code=None):
    try:
        data = request.get_json() or {}
        forum_course_code = course_code or data.get('course_code')
        title = data.get('title')
        description = data.get('description')

        if not forum_course_code or not title:
            return make_response({'error': 'course_code and title are required'}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute('SELECT course_code FROM courses WHERE course_code = %s', (forum_course_code,))
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({'error': 'Course not found'}, 404)

        cursor.execute(
            '''
            INSERT INTO discussion_forum (course_code, title, description)
            VALUES (%s, %s, %s)
            ''',
            (forum_course_code, title, description)
        )
        forum_id = cursor.lastrowid
        cnx.commit()
        cursor.close()
        cnx.close()

        return make_response({'message': 'Discussion forum created', 'forum_id': forum_id}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/courses/<course_code>/forums', methods=['GET'])
def get_course_forums(course_code):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT forum_id, course_code, title, description, date_created
            FROM discussion_forum
            WHERE course_code = %s
            ORDER BY date_created DESC
            ''',
            (course_code,)
        )
        forums = cursor.fetchall()
        cursor.close()
        cnx.close()

        return make_response({'course_code': course_code, 'forums': forums}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


# Creates a new thread
@app.route('/create_thread', methods=['POST'])
@app.route('/forums/thread/create', methods=['POST'])
def create_thread():
    try:
        data = request.get_json() or {}
        required = ['forum_id', 'title', 'initial_post', 'user_id']
        missing = [field for field in required if not data.get(field)]
        if missing:
            return make_response({'error': f"Missing required fields: {', '.join(missing)}"}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute('SELECT forum_id FROM discussion_forum WHERE forum_id = %s', (data['forum_id'],))
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({'error': 'Forum not found'}, 404)

        cursor.execute('SELECT user_id FROM users WHERE user_id = %s', (data['user_id'],))
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({'error': 'User not found'}, 404)
        
        query = """INSERT INTO discussion_thread (forum_id, title, initial_post, user_id) 
                   VALUES (%s, %s, %s, %s)"""
        cursor.execute(query, (data['forum_id'], data['title'], data['initial_post'], data['user_id']))
        thread_id = cursor.lastrowid
        
        cnx.commit()
        cursor.close()
        cnx.close()
        return make_response({'message': 'Thread created!', 'thread_id': thread_id}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/forums/<int:forum_id>/threads', methods=['GET'])
def get_forum_threads(forum_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT dt.thread_id, dt.forum_id, dt.title, dt.initial_post, dt.user_id,
                   u.full_name AS created_by, dt.date_created,
                   COUNT(r.reply_id) AS reply_count
            FROM discussion_thread dt
            JOIN users u ON dt.user_id = u.user_id
            LEFT JOIN replies r ON dt.thread_id = r.thread_id
            WHERE dt.forum_id = %s
            GROUP BY dt.thread_id, dt.forum_id, dt.title, dt.initial_post,
                     dt.user_id, u.full_name, dt.date_created
            ORDER BY dt.date_created DESC
            ''',
            (forum_id,)
        )
        threads = cursor.fetchall()
        cursor.close()
        cnx.close()

        return make_response({'forum_id': forum_id, 'threads': threads}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/add_reply', methods=['POST'])
@app.route('/threads/<int:thread_id>/replies', methods=['POST'])
def add_reply(thread_id=None):
    try:
        data = request.get_json() or {}
        reply_thread_id = thread_id or data.get('thread_id')
        user_id = data.get('user_id')
        body = data.get('body')
        parent_reply_id = data.get('parent_reply_id')

        if not reply_thread_id or not user_id or not body:
            return make_response({'error': 'thread_id, user_id, and body are required'}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute('SELECT thread_id FROM discussion_thread WHERE thread_id = %s', (reply_thread_id,))
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({'error': 'Thread does not exist'}, 404)

        cursor.execute('SELECT user_id FROM users WHERE user_id = %s', (user_id,))
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({'error': 'User not found'}, 404)

        if parent_reply_id:
            cursor.execute(
                'SELECT reply_id FROM replies WHERE reply_id = %s AND thread_id = %s',
                (parent_reply_id, reply_thread_id)
            )
            if not cursor.fetchone():
                cursor.close()
                cnx.close()
                return make_response({'error': 'Parent reply does not exist in this thread'}, 404)

        cursor.execute(
            '''
            INSERT INTO replies (thread_id, parent_reply_id, user_id, body)
            VALUES (%s, %s, %s, %s)
            ''',
            (reply_thread_id, parent_reply_id, user_id, body)
        )
        reply_id = cursor.lastrowid
        cnx.commit()
        cursor.close()
        cnx.close()

        return make_response({'message': 'Reply added', 'reply_id': reply_id}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Retrieves thread and replies
@app.route('/threads/<int:thread_id>', methods=['GET'])
def get_thread_content(thread_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        
    
        cursor.execute('SELECT * FROM discussion_thread WHERE thread_id = %s', (thread_id,))
        thread = cursor.fetchone()
        if not thread:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Thread not found'}, 404)
        
        
        cursor.execute('SELECT * FROM replies WHERE thread_id = %s ORDER BY date_created ASC', (thread_id,))
        all_replies = cursor.fetchall()
        
       
        def build_tree(replies, parent_id=None):
            branch = []
            for r in replies:
                if r['parent_reply_id'] == parent_id:
                    children = build_tree(replies, r['reply_id'])
                    if children:
                        r['replies'] = children
                    branch.append(r)
            return branch

        thread['replies'] = build_tree(all_replies)
        
        cursor.close()
        cnx.close()
        return make_response(thread, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Lecturer can add content to course
@app.route('/courses/content/upload', methods=['POST'])
def upload_content():
    try:
        data = request.get_json()
        cnx = get_db()
        cursor = cnx.cursor()
        
        cursor.execute('SELECT lecturer_id FROM courses WHERE course_code = %s', (data['course_code'],))
        result = cursor.fetchone()
        
        if not result or result[0] != data['lecturer_id']:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Unauthorized: You are not the lecturer for this course'}, 403)

        cursor.execute('SELECT section_id FROM sections WHERE section_id = %s AND course_code = %s', (data['section_id'], data['course_code']))
        section = cursor.fetchone()
        if not section:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Section does not belong to this course'}, 400)

        query = """INSERT INTO course_content 
                   (course_code, section_id, lecturer_id, title, content_type, content_url) 
                   VALUES (%s, %s, %s, %s, %s, %s)"""
        values = (data['course_code'], data['section_id'], data['lecturer_id'], 
                  data['title'], data['content_type'], data['content_url'])
        
        cursor.execute(query, values)
        cnx.commit()
        cursor.close()
        cnx.close()
        return make_response({'message': 'Content uploaded successfully!'}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Retrieves course content
@app.route('/courses/<course_code>/content', methods=['GET'])
def get_full_course_content(course_code):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        
        query = """
            SELECT s.title AS section_name, cc.title, cc.content_type, cc.content_url 
            FROM sections s
            LEFT JOIN course_content cc ON s.section_id = cc.section_id
            WHERE s.course_code = %s
            ORDER BY s.order_index ASC
        """
        cursor.execute(query, (course_code,))
        content = cursor.fetchall()
        
        cursor.close()
        cnx.close()
        return make_response({'course_code': course_code, 'content': content}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/courses/<course_code>/assignments', methods=['GET'])
def get_course_assignments(course_code):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT assignment_id, course_code, title, due_date, total_marks, description
            FROM assignments
            WHERE course_code = %s
            ORDER BY due_date ASC
            ''',
            (course_code,)
        )
        assignments = cursor.fetchall()
        cursor.close()
        cnx.close()

        return make_response({'course_code': course_code, 'assignments': assignments}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/submit_assignment', methods=['POST'])
@app.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
def submit_assignment(assignment_id=None):
    try:
        data = request.get_json() or {}
        submission_assignment_id = assignment_id or data.get('assignment_id')
        student_id = data.get('student_id')
        file_url = data.get('file_url')
        text_answer = data.get('text_answer')

        if not submission_assignment_id or not student_id:
            return make_response({'error': 'assignment_id and student_id are required'}, 400)

        if not file_url and not text_answer:
            return make_response({'error': 'A file URL or text answer is required'}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT a.assignment_id, a.course_code, a.due_date
            FROM assignments a
            JOIN enrollments e ON a.course_code = e.course_code
            WHERE a.assignment_id = %s AND e.student_id = %s
            ''',
            (submission_assignment_id, student_id)
        )
        assignment = cursor.fetchone()

        if not assignment:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Assignment not found for this enrolled student'}, 404)

        submission_status = 'submitted'
        due_date = assignment.get('due_date')
        if due_date and datetime.now() > due_date:
            submission_status = 'late'

        cursor.execute(
            '''
            INSERT INTO submissions
                (assignment_id, student_id, file_url, text_answer, submission_status)
            VALUES (%s, %s, %s, %s, %s)
            ''',
            (submission_assignment_id, student_id, file_url, text_answer, submission_status)
        )
        submission_id = cursor.lastrowid
        cnx.commit()
        cursor.close()
        cnx.close()

        return make_response(
            {'message': 'Assignment submitted', 'submission_id': submission_id, 'submission_status': submission_status},
            201
        )
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
def get_assignment_submissions(assignment_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT s.submission_id, s.assignment_id, s.student_id, u.full_name,
                   s.submission_time, s.file_url, s.text_answer, s.submission_status,
                   g.grade_id, g.score, g.graded_by_lecturer_id
            FROM submissions s
            JOIN users u ON s.student_id = u.user_id
            LEFT JOIN grades g ON s.submission_id = g.submission_id
            WHERE s.assignment_id = %s
            ORDER BY s.submission_time DESC
            ''',
            (assignment_id,)
        )
        submissions = cursor.fetchall()
        cursor.close()
        cnx.close()

        return make_response({'assignment_id': assignment_id, 'submissions': submissions}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/students/<int:student_id>/submissions', methods=['GET'])
def get_student_submissions(student_id):
    try:
        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT s.submission_id, s.assignment_id, a.title AS assignment_title,
                   a.course_code, s.submission_time, s.file_url, s.text_answer,
                   s.submission_status, g.score
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            LEFT JOIN grades g ON s.submission_id = g.submission_id
            WHERE s.student_id = %s
            ORDER BY s.submission_time DESC
            ''',
            (student_id,)
        )
        submissions = cursor.fetchall()
        cursor.close()
        cnx.close()

        return make_response({'student_id': student_id, 'submissions': submissions}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/grade_assignment', methods=['POST'])
@app.route('/submissions/<int:submission_id>/grade', methods=['POST'])
def grade_assignment(submission_id=None):
    try:
        data = request.get_json() or {}
        grade_submission_id = submission_id or data.get('submission_id')
        lecturer_id = data.get('graded_by_lecturer_id') or data.get('lecturer_id')
        score = data.get('score')

        if not grade_submission_id or not lecturer_id or score is None:
            return make_response({'error': 'submission_id, graded_by_lecturer_id, and score are required'}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT s.submission_id, a.total_marks, c.lecturer_id
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            JOIN courses c ON a.course_code = c.course_code
            WHERE s.submission_id = %s
            ''',
            (grade_submission_id,)
        )
        submission = cursor.fetchone()

        if not submission:
            cursor.close()
            cnx.close()
            return make_response({'error': 'Submission not found'}, 404)

        if submission['lecturer_id'] != int(lecturer_id):
            cursor.close()
            cnx.close()
            return make_response({'error': 'Only the course lecturer can grade this submission'}, 403)

        if float(score) < 0 or float(score) > float(submission['total_marks']):
            cursor.close()
            cnx.close()
            return make_response({'error': 'Score must be between 0 and the assignment total marks'}, 400)

        cursor.execute(
            '''
            INSERT INTO grades (submission_id, graded_by_lecturer_id, score)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                graded_by_lecturer_id = VALUES(graded_by_lecturer_id),
                score = VALUES(score)
            ''',
            (grade_submission_id, lecturer_id, score)
        )
        cursor.execute(
            'UPDATE submissions SET submission_status = %s WHERE submission_id = %s',
            ('graded', grade_submission_id)
        )
        cnx.commit()
        cursor.close()
        cnx.close()

        return make_response({'message': 'Assignment graded'}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/reports', methods=['GET'])
def get_reports():
    try:
        reports = []
        for view_name, title in REPORT_VIEWS.items():
            reports.append({
                'name': view_name,
                'title': title,
                'rows': fetch_all_from_view(view_name)
            })

        return make_response({'reports': reports}, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route('/reports/<report_name>', methods=['GET'])
def get_report(report_name):
    try:
        rows = fetch_all_from_view(report_name)
        if rows is None:
            return make_response({'error': 'Report not found'}, 404)

        return make_response({
            'name': report_name,
            'title': REPORT_VIEWS[report_name],
            'rows': rows
        }, 200)
    except Exception as e:
        return make_response({'error': str(e)}, 400)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True)
