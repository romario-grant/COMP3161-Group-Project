from flask import Flask, request, make_response
import mysql.connector

app = Flask(__name__)


@app.route('/register_user', methods=['POST'])

def register_user():
    try:
        data = request.get_json()

        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
        cursor = cnx.cursor()
        values = (data['user_id'], data['email'], data['password_hash'], data['role'], data['full_name'], data['created_at'])
        cursor.execute('INSERT INTO users (user_id, email, password_hash, role, full_name, created_at) VALUES (%s, %s, %s, %s, %s, %s)', values)
        role = data['role']
        if role == 'student':
            cursor.execute('INSERT INTO students (student_id) VALUES (%s)', (data['user_id'],))
        elif role == 'lecturer':
            cursor.execute('INSERT INTO lecturers (lecturer_id) VALUES (%s)', (data['user_id'],))
        elif role == 'admin':
            cursor.execute('INSERT INTO admins (admin_id) VALUES (%s)', (data['user_id'],))

        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({'message': 'User registered successfully!'}, 201)
    
    except  Exception as e:
        return make_response({'error': str(e)}, 400)

@app.route('/users/<int:user_id>', methods=['GET'])

def user_login(user_id):
    try:
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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

@app.route('/create_course', methods=['POST'])

def create_course():
    try:
        data = request.get_json()
        
        user_id = data.get('user_id')

        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
        cursor = cnx.cursor()

        cursor.execute('INSERT INTO enrollments (student_id, course_code) VALUES (%s, %s)', (student_id, course_code))

        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({'message': 'Student registered for course!'}, 201)
    except Exception as e:
        return make_response({'error':str(e)}, 400)


@app.route('/enrollments/<course_code>', methods=['GET'])

def get_course_students(course_code):
    try:
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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

#Creates newthread
@app.route('/forums/thread/create', methods=['POST'])
def create_thread():
    try:
        data = request.get_json()
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
        cursor = cnx.cursor()
        
        query = """INSERT INTO discussion_thread (forum_id, title, initial_post, user_id) 
                   VALUES (%s, %s, %s, %s)"""
        cursor.execute(query, (data['forum_id'], data['title'], data['initial_post'], data['user_id']))
        
        cnx.commit()
        cursor.close()
        cnx.close()
        return make_response({'message': 'Thread created!'}, 201)
    except Exception as e:
        return make_response({'error': str(e)}, 400)

#Retrieves thread and replies
@app.route('/threads/<int:thread_id>', methods=['GET'])
def get_thread_content(thread_id):
    try:
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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
        cnx = mysql.connector.connect(user='user_1', password='password876', host='127.0.0.1', database='course_mgmt')
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


if __name__ == "__main__":
    app.run(debug=True)
