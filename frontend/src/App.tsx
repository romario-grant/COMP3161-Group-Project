import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  KeyRound,
  Layers3,
  Link as LinkIcon,
  LogIn,
  MessageSquareText,
  Plus,
  Presentation,
  Search,
  Send,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Badge from "./components/Badge";
import GlassButton from "./components/GlassButton";
import GlassIcon from "./components/GlassIcon";
import GlassSpinner from "./components/GlassSpinner";
import MotionCard from "./components/MotionCard";
import Navbar from "./components/Navbar";
import {
  api,
  type Assignment,
  type Course,
  type CourseContent,
  type EventRow,
  type Forum,
  type Report,
  type Reply,
  type Submission,
  type Thread,
  type User,
} from "./lib/api";

type LoadState = "idle" | "loading" | "ready" | "error";
type DraftUser = User & { password_hash: string };
type CourseTool = "overview" | "members" | "calendar" | "forums" | "content" | "assignments" | "reports";

const demoPassword = "";
const savedUserKey = "coursesense:user";
const savedUsersKey = "coursesense:users";
const savedLocalKey = "coursesense:local-data";

const seedUsers: DraftUser[] = [];

const fallbackAssignments: Assignment[] = [];

const fallbackReports: Report[] = [];

const fallbackForums: Forum[] = [];

const fallbackThreads: Thread[] = [];

const fallbackReplies: Reply[] = [];

const fallbackMembers: Record<string, { student_id: number; full_name: string }[]> = {};

function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function todayStamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function roleFromEmail(email: string): User["role"] {
  const prefix = email.trim().toLowerCase().split("@")[0] || "";
  if (prefix.startsWith("admin")) return "admin";
  if (prefix.startsWith("lecturer")) return "lecturer";
  return "student";
}

function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children: string }) {
  void children;
  return (
    <motion.div className="page-header" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: string }) {
  return (
    <MotionCard hover={false} className="empty-state">
      <Icon size={38} />
      <h3>{title}</h3>
      <p>{children}</p>
    </MotionCard>
  );
}

function Notice({ type = "warn", children }: { type?: "warn" | "success"; children: ReactNode }) {
  return (
    <div className={`api-gap-banner ${type === "success" ? "success" : ""}`}>
      {type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      {children}
    </div>
  );
}

function LoginView({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, passwordHash: string) => Promise<void>;
  onRegister: (user: Omit<DraftUser, "user_id">) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [passwordHash, setPasswordHash] = useState("");
  const [fullName, setFullName] = useState("");
  const [loginState, setLoginState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const inferredRole = roleFromEmail(email);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoginState("loading");
    try {
      if (mode === "login") {
        await onLogin(email.trim(), passwordHash);
      } else {
        await onRegister({ email: email.trim(), password_hash: passwordHash, role: inferredRole, full_name: fullName.trim() });
      }
      setLoginState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account action failed");
      setLoginState("error");
    }
  };

  return (
    <main className="login-shell">
      <motion.section className="login-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="login-copy">
          <img className="login-logo-large" src="/sle-logo.png" alt="SLE" />
          <h1>{mode === "login" ? "Sign in to SLE." : "Create your account."}</h1>
        </div>

        <MotionCard hover={false} className="login-card">
          <div className="segmented">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Sign In
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Create Account
            </button>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <div className="section-title">
              <div>
                <h2>{mode === "login" ? "Account Login" : "New Account"}</h2>
              </div>
              <GlassIcon tone="blue" size="2.35rem">
                {mode === "login" ? <KeyRound size={18} /> : <UserPlus size={18} />}
              </GlassIcon>
            </div>

            {mode === "register" && (
              <>
                <label>
                  Full Name
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                </label>
              </>
            )}
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input value={passwordHash} onChange={(event) => setPasswordHash(event.target.value)} required />
            </label>

            {error && <Notice>{error}</Notice>}

            <GlassButton type="submit" variant="primary" disabled={loginState === "loading"}>
              {loginState === "loading" ? <GlassSpinner size={18} /> : <LogIn size={16} />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </GlassButton>
          </form>

        </MotionCard>
      </motion.section>
    </main>
  );
}

function App() {
  const [users, setUsers] = useState<DraftUser[]>(() => loadJson(savedUsersKey, seedUsers));
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadJson<User | null>(savedUserKey, null));
  const [localData, setLocalData] = useState(() =>
    loadJson(savedLocalKey, {
      courses: [] as Course[],
      events: [] as EventRow[],
      content: [] as CourseContent[],
      forums: fallbackForums,
      threads: fallbackThreads,
      replies: fallbackReplies,
      assignments: fallbackAssignments,
      submissions: [] as Submission[],
      members: fallbackMembers,
    })
  );
  const [active, setActive] = useState("dashboard");
  const [courses, setCourses] = useState<Course[]>(localData.courses);
  const [events, setEvents] = useState<EventRow[]>(localData.events);
  const [content, setContent] = useState<CourseContent[]>(localData.content);
  const [forums, setForums] = useState<Forum[]>(localData.forums);
  const [threads, setThreads] = useState<Thread[]>(localData.threads);
  const [replies, setReplies] = useState<Reply[]>(localData.replies);
  const [assignments, setAssignments] = useState<Assignment[]>(localData.assignments);
  const [submissions, setSubmissions] = useState<Submission[]>(localData.submissions);
  const [reports, setReports] = useState<Report[]>(fallbackReports);
  const [members, setMembers] = useState<Record<string, { student_id: number; full_name: string }[]>>(localData.members);
  const [selectedCourse, setSelectedCourse] = useState(localData.courses[0]?.course_code || "COMP4187");
  const [courseTool, setCourseTool] = useState<CourseTool>("overview");
  const [selectedForumId, setSelectedForumId] = useState<number | null>(localData.forums[0]?.forum_id || null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(localData.threads[0]?.thread_id || null);
  const [status, setStatus] = useState<LoadState>("idle");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    localStorage.setItem(savedUsersKey, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser?.role !== "admin" && active === "reports") {
      setActive("dashboard");
    }
  }, [active, currentUser?.role]);

  useEffect(() => {
    localStorage.setItem(
      savedLocalKey,
      JSON.stringify({ courses, events, content, forums, threads, replies, assignments, submissions, members })
    );
  }, [assignments, content, courses, events, forums, members, replies, submissions, threads]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setStatus("loading");
    Promise.allSettled([
      api.getCourses(),
      api.getCourseEvents(selectedCourse),
      api.getCourseContent(selectedCourse),
      api.getCourseAssignments(selectedCourse),
      api.getCourseForums(selectedCourse),
      api.getReports(),
      api.getMembers(selectedCourse),
    ]).then(([courseResult, eventResult, contentResult, assignmentResult, forumResult, reportResult, memberResult]) => {
      if (cancelled) return;
      let failed = false;
      if (courseResult.status === "fulfilled" && courseResult.value.length) setCourses(courseResult.value);
      else failed = true;
      if (eventResult.status === "fulfilled") setEvents(eventResult.value.events);
      else failed = true;
      if (contentResult.status === "fulfilled") setContent(contentResult.value.content.filter((row) => row.title));
      else failed = true;
      if (assignmentResult.status === "fulfilled") setAssignments(assignmentResult.value.assignments);
      else failed = true;
      if (forumResult.status === "fulfilled") {
        setForums((prev) => {
          const otherForums = prev.filter((forum) => forum.course_code !== selectedCourse);
          return [...otherForums, ...forumResult.value.forums];
        });
        setSelectedForumId(forumResult.value.forums[0]?.forum_id || null);
      } else {
        failed = true;
      }
      if (reportResult.status === "fulfilled") setReports(reportResult.value.reports);
      else failed = true;
      if (memberResult.status === "fulfilled") {
        setMembers((prev) => ({ ...prev, [selectedCourse]: memberResult.value.students }));
      } else {
        failed = true;
      }
      setApiError(failed ? "Using browser-local data where the Flask API or MySQL database is not reachable." : "");
      setStatus(failed ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, selectedCourse]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") return;
    let cancelled = false;
    api
      .getStudentCourses(String(currentUser.user_id))
      .then((result) => {
        if (cancelled) return;
        const enrolledCodes = result.courses.map((c) => c.course_code);
        Promise.allSettled(enrolledCodes.map((code) => api.getMembers(code))).then((results) => {
          if (cancelled) return;
          setMembers((prev) => {
            const updated = { ...prev };
            results.forEach((r, i) => {
              if (r.status === "fulfilled") {
                updated[enrolledCodes[i]] = r.value.students;
              } else if (!updated[enrolledCodes[i]]) {
                updated[enrolledCodes[i]] = [{ student_id: currentUser.user_id, full_name: currentUser.full_name }];
              }
            });
            return updated;
          });
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") return;
    let cancelled = false;
    api
      .getStudentSubmissions(currentUser.user_id)
      .then((result) => {
        if (cancelled) return;
        setSubmissions(result.submissions);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    const courseForums = forums.filter((forum) => forum.course_code === selectedCourse);
    setSelectedForumId(courseForums[0]?.forum_id || null);
  }, [forums, selectedCourse]);

  useEffect(() => {
    if (!selectedForumId) {
      setSelectedThreadId(null);
      return;
    }
    api
      .getForumThreads(selectedForumId)
      .then((result) => {
        setThreads((prev) => [...prev.filter((thread) => thread.forum_id !== selectedForumId), ...result.threads]);
        setSelectedThreadId(result.threads[0]?.thread_id || null);
      })
      .catch(() => {
        const forumThreads = threads.filter((thread) => thread.forum_id === selectedForumId);
        setSelectedThreadId(forumThreads[0]?.thread_id || null);
      });
    // Intentionally tied to forum changes; local thread changes update the selected thread directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForumId]);

  const handleLogin = async (email: string, passwordHash: string) => {
    try {
      const response = await api.login({ email, password_hash: passwordHash });
      localStorage.setItem(savedUserKey, JSON.stringify(response.user));
      setCurrentUser(response.user);
      setActive("dashboard");
      return;
    } catch {
      const localUser = users.find((user) => user.email === email && user.password_hash === passwordHash);
      if (!localUser) throw new Error("Invalid email or password.");
      localStorage.setItem(savedUserKey, JSON.stringify(localUser));
      setCurrentUser(localUser);
      setActive("dashboard");
    }
  };

  const handleRegister = async (newUser: Omit<DraftUser, "user_id">) => {
    if (users.some((user) => user.email === newUser.email)) throw new Error("An account with this email already exists.");
    let registeredUser: DraftUser = { ...newUser, user_id: Math.max(...users.map((user) => user.user_id), 1000) + 1 };
    try {
      await api.createUser(registeredUser);
      const login = await api.login({ email: newUser.email, password_hash: newUser.password_hash });
      registeredUser = { ...registeredUser, ...login.user };
    } catch {
      setApiError("Account saved locally because the API/database is not reachable.");
    }
    setUsers((prev) => [...prev, registeredUser]);
    localStorage.setItem(savedUserKey, JSON.stringify(registeredUser));
    setCurrentUser(registeredUser);
    setActive("all-courses");
  };

  const handleSignOut = () => {
    localStorage.removeItem(savedUserKey);
    setCurrentUser(null);
    setActive("dashboard");
  };

  const myCourses = courses.filter((course) => {
    if (currentUser?.role === "student") {
      return Boolean(members[course.course_code]?.some((member) => member.student_id === currentUser.user_id));
    }
    if (currentUser?.role === "lecturer") {
      return course.lecturer_id === currentUser.user_id;
    }
    return true;
  });
  const currentCourse = courses.find((course) => course.course_code === selectedCourse) || courses[0];
  const courseEvents = events.filter((event) => event.course_code === selectedCourse);
  const courseContent = content.filter((item) => !item.course_code || item.course_code === selectedCourse);
  const courseForums = forums.filter((forum) => forum.course_code === selectedCourse);
  const activeForum = courseForums.find((forum) => forum.forum_id === selectedForumId) || courseForums[0];
  const forumThreads = activeForum ? threads.filter((thread) => thread.forum_id === activeForum.forum_id) : [];
  const activeThread = forumThreads.find((thread) => thread.thread_id === selectedThreadId) || forumThreads[0];
  const threadReplies = activeThread ? replies.filter((reply) => reply.thread_id === activeThread.thread_id) : [];
  const courseAssignments = assignments.filter((assignment) => assignment.course_code === selectedCourse);

  const stats = useMemo(
    () =>
      currentUser?.role === "admin"
        ? [
            { label: "Total Courses", value: courses.length, icon: BookOpen, tone: "blue" },
            { label: "Signed In As", value: currentUser?.role || "Guest", icon: GraduationCap, tone: "safe" },
            { label: "Reports", value: reports.length, icon: BarChart3, tone: "info" },
            { label: "Role", value: "Admin", icon: Users, tone: "blue" },
          ]
        : [
            { label: "Courses Loaded", value: courses.length, icon: BookOpen, tone: "blue" },
            { label: "Signed In As", value: currentUser?.role || "Guest", icon: GraduationCap, tone: "safe" },
            { label: "Selected Course", value: selectedCourse, icon: Layers3, tone: "info" },
            { label: "Course Members", value: members[selectedCourse]?.length || 0, icon: Users, tone: "blue" },
          ],
    [courses.length, currentUser?.role, members, reports.length, selectedCourse]
  );

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="app-shell">
      <Navbar
        active={active}
        setActive={setActive}
        userName={currentUser.full_name}
        userRole={currentUser.role}
        onSignOut={handleSignOut}
      />
      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.section
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {active === "dashboard" && (
              <Dashboard
                stats={stats}
                courses={courses}
                myCourses={myCourses}
                events={courseEvents}
                content={courseContent}
                setActive={setActive}
                status={status}
                selectedCourse={selectedCourse}
                currentUser={currentUser}
                reports={reports}
                members={members}
                assignments={assignments}
                submissions={submissions}
              />
            )}
            {(active === "all-courses" || active === "courses") && (
              <Courses
                mode={currentUser.role === "admin" && active === "all-courses" ? "create" : active === "all-courses" ? "all" : "mine"}
                courses={currentUser.role === "admin" ? courses : active === "all-courses" ? courses : myCourses}
                selectedCourse={selectedCourse}
                currentCourse={currentCourse}
                currentUser={currentUser}
                members={members}
                courseTool={courseTool}
                onToolChange={setCourseTool}
                events={courseEvents}
                content={courseContent}
                forums={courseForums}
                selectedForum={activeForum}
                selectedThread={activeThread}
                threads={forumThreads}
                replies={threadReplies}
                assignments={courseAssignments}
                submissions={submissions}
                reports={reports}
                onSelect={(courseCode) => {
                  setSelectedCourse(courseCode);
                  setCourseTool("overview");
                }}
                onEnroll={async (courseCode) => {
                  if (currentUser.role !== "student") return;
                  const enrolledCount = Object.values(members).filter((m) =>
                    m.some((s) => s.student_id === currentUser.user_id)
                  ).length;
                  if (enrolledCount >= 6) {
                    setApiError("You cannot enroll in more than 6 courses.");
                    return;
                  }
                  try {
                    await api.registerForCourse({ student_id: currentUser.user_id, course_code: courseCode });
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "";
                    if (msg.includes("more than 6")) {
                      setApiError("You cannot enroll in more than 6 courses.");
                      return;
                    }
                    setApiError("Enrollment saved locally because the API/database is not reachable.");
                  }
                  setMembers((prev) => ({
                    ...prev,
                    [courseCode]: [
                      ...(prev[courseCode] || []).filter((member) => member.student_id !== currentUser.user_id),
                      { student_id: currentUser.user_id, full_name: currentUser.full_name },
                    ],
                  }));
                }}
                onCreateCourse={async (course) => {
                  try {
                    await api.createCourse({ ...course, user_id: currentUser.user_id });
                  } catch {
                    setApiError("Course saved locally because the API/database is not reachable.");
                  }
                  setCourses((prev) => [course, ...prev.filter((item) => item.course_code !== course.course_code)]);
                  setSelectedCourse(course.course_code);
                  setCourseTool("overview");
                }}
                onCreateEvent={async (event) => {
                  try {
                    await api.createEvent(event);
                  } catch {
                    setApiError("Calendar event saved locally because the API/database is not reachable.");
                  }
                  setEvents((prev) => [{ ...event, event_id: Date.now() }, ...prev]);
                }}
                onSelectForum={setSelectedForumId}
                onSelectThread={setSelectedThreadId}
                onCreateForum={async (forum) => {
                  try {
                    const result = await api.createForum(forum);
                    const created = { ...forum, forum_id: result.forum_id, date_created: todayStamp() };
                    setForums((prev) => [created, ...prev]);
                    setSelectedForumId(result.forum_id);
                  } catch {
                    const forumId = Date.now();
                    setForums((prev) => [{ ...forum, forum_id: forumId, date_created: todayStamp() }, ...prev]);
                    setSelectedForumId(forumId);
                    setApiError("Forum saved locally because the API/database is not reachable.");
                  }
                }}
                onCreateThread={async (thread) => {
                  const created: Thread = {
                    ...thread,
                    thread_id: Date.now(),
                    created_by: currentUser.full_name,
                    reply_count: 0,
                    date_created: todayStamp(),
                  };
                  try {
                    const result = await api.createThread(thread);
                    created.thread_id = result.thread_id;
                  } catch {
                    setApiError("Thread saved locally because the API/database is not reachable.");
                  }
                  setThreads((prev) => [created, ...prev]);
                  setSelectedThreadId(created.thread_id);
                }}
                onReply={async (threadId, body, parentReplyId) => {
                  const reply: Reply = {
                    reply_id: Date.now(),
                    thread_id: threadId,
                    parent_reply_id: parentReplyId || null,
                    user_id: currentUser.user_id,
                    body,
                    date_created: todayStamp(),
                  };
                  try {
                    const result = await api.addReply(threadId, { user_id: currentUser.user_id, body, parent_reply_id: parentReplyId || null });
                    reply.reply_id = result.reply_id;
                  } catch {
                    setApiError("Reply saved locally because the API/database is not reachable.");
                  }
                  setReplies((prev) => [...prev, reply]);
                  setThreads((prev) =>
                    prev.map((thread) =>
                      thread.thread_id === threadId ? { ...thread, reply_count: (thread.reply_count || 0) + 1 } : thread
                    )
                  );
                }}
                onUpload={async (item) => {
                  try {
                    await api.uploadContent(item);
                  } catch {
                    setApiError("Content saved locally because the API/database is not reachable.");
                  }
                  setContent((prev) => [
                    {
                      content_id: Date.now(),
                      section_id: item.section_id,
                      course_code: selectedCourse,
                      section_name: `Section ${item.section_id}`,
                      title: item.title,
                      content_type: item.content_type as CourseContent["content_type"],
                      content_url: item.content_url,
                    },
                    ...prev,
                  ]);
                }}
                onSubmitAssignment={async (assignment, textAnswer) => {
                  const created: Submission = {
                    submission_id: Date.now(),
                    assignment_id: assignment.assignment_id,
                    assignment_title: assignment.title,
                    course_code: assignment.course_code,
                    student_id: currentUser.user_id,
                    full_name: currentUser.full_name,
                    text_answer: textAnswer,
                    submission_time: todayStamp(),
                    submission_status: "submitted",
                  };
                  try {
                    const result = await api.submitAssignment(assignment.assignment_id, {
                      student_id: currentUser.user_id,
                      text_answer: textAnswer,
                    });
                    created.submission_id = result.submission_id;
                    created.submission_status = result.submission_status;
                  } catch {
                    setApiError("Submission saved locally because the API/database is not reachable.");
                  }
                  setSubmissions((prev) => [
                    created,
                    ...prev.filter(
                      (submission) =>
                        !(submission.assignment_id === assignment.assignment_id && submission.student_id === currentUser.user_id)
                    ),
                  ]);
                }}
                onGrade={async (submissionId, score) => {
                  try {
                    await api.gradeSubmission(submissionId, { lecturer_id: currentUser.user_id, score });
                  } catch {
                    setApiError("Grade saved locally because the API/database is not reachable.");
                  }
                  setSubmissions((prev) =>
                    prev.map((submission) =>
                      submission.submission_id === submissionId
                        ? {
                            ...submission,
                            score,
                            submission_status: "graded",
                            graded_by_lecturer_id: currentUser.user_id,
                          }
                        : submission
                    )
                  );
                }}
              />
            )}
            {active === "register-user" && currentUser.role === "admin" && (
              <RegisterUser />
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

function CourseContextBar({
  courses,
  selectedCourse,
  currentCourse,
  onSelect,
}: {
  courses: Course[];
  selectedCourse: string;
  currentCourse?: Course;
  onSelect: (course: string) => void;
}) {
  return (
    <div className="course-context">
      <div>
        <Badge variant="blue">Course Context</Badge>
        <strong>{currentCourse?.course_title || selectedCourse}</strong>
        <span>{selectedCourse}</span>
      </div>
      <select value={selectedCourse} onChange={(event) => onSelect(event.target.value)}>
        {courses.map((course) => (
          <option value={course.course_code} key={course.course_code}>
            {course.course_code} - {course.course_title}
          </option>
        ))}
      </select>
    </div>
  );
}

function Dashboard({
  stats,
  courses,
  myCourses,
  events,
  content,
  setActive,
  status,
  selectedCourse,
  currentUser,
  reports,
  members,
  assignments,
  submissions,
}: {
  stats: { label: string; value: string | number; icon: LucideIcon; tone: string }[];
  courses: Course[];
  myCourses: Course[];
  events: EventRow[];
  content: CourseContent[];
  setActive: (page: string) => void;
  status: LoadState;
  selectedCourse: string;
  currentUser: User;
  reports: Report[];
  members: Record<string, { student_id: number; full_name: string }[]>;
  assignments: Assignment[];
  submissions: Submission[];
}) {
  const isAdmin = currentUser.role === "admin";
  const isStudent = currentUser.role === "student";
  const enrolledCount = isStudent
    ? Object.values(members).filter((m) => m.some((s) => s.student_id === currentUser.user_id)).length
    : 0;
  const mySubmissions = isStudent
    ? submissions.filter((s) => s.student_id === currentUser.user_id)
    : [];
  const gradedSubmissions = mySubmissions.filter((s) => s.submission_status === "graded");

  const quickActions = isAdmin
    ? [
        { page: "courses", label: "All Courses", icon: BookOpen },
        { page: "all-courses", label: "Create a Course", icon: Plus },
        { page: "register-user", label: "Register User", icon: UserPlus },
      ]
    : isStudent
      ? [
          { page: "courses", label: "My Courses", icon: BookOpen },
          { page: "all-courses", label: "Browse & Enroll", icon: Layers3 },
        ]
      : [
          { page: "all-courses", label: "All Courses", icon: BookOpen },
          { page: "courses", label: "My Courses", icon: Layers3 },
        ];

  return (
    <>
      <section className="hero-panel">
        <div className="hero-photo" />
        <div className="hero-content">
          <h1>{isAdmin ? "Admin Dashboard" : isStudent ? `Welcome, ${currentUser.full_name.split(" ")[0]}.` : "One workspace for every course action."}</h1>
          <p>
            {isAdmin
              ? "Manage courses, register users, and view system reports."
              : isStudent
                ? `You are enrolled in ${enrolledCount} of 6 courses.`
                : "Select a course to open its tools and activity."}
          </p>
          {!isAdmin && (
            <div className="hero-actions">
              <GlassButton variant="primary" onClick={() => setActive(isStudent ? "courses" : "all-courses")}>
                <BookOpen size={16} />
                {isStudent ? "My Courses" : "Explore Courses"}
              </GlassButton>
              {isStudent && (
                <GlassButton onClick={() => setActive("all-courses")}>
                  <Layers3 size={16} />
                  Browse & Enroll
                </GlassButton>
              )}
            </div>
          )}
        </div>
      </section>

      {currentUser.role === "lecturer" && (
        <div className="stats-grid">
          {stats.map(({ label, value, icon: Icon, tone }, index) => (
            <MotionCard key={label} delay={index * 0.05} hover={false} className="stat-card">
              <GlassIcon tone={tone as "safe" | "warn" | "blue" | "info"} size="2rem">
                <Icon size={18} />
              </GlassIcon>
              <p>{label}</p>
              <strong>{value}</strong>
            </MotionCard>
          ))}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Quick Actions — all roles */}
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{isAdmin ? "Quick Actions" : isStudent ? "Quick Actions" : `${selectedCourse} Activity`}</h2>
              <p>{status === "loading" ? "Loading..." : isAdmin ? "Manage the system." : isStudent ? "Jump to your courses and assignments." : "Course activity snapshot."}</p>
            </div>
            {status === "loading" && <GlassSpinner size={28} />}
          </div>
          <div className="quick-list">
            {quickActions.map(({ page, label, icon: Icon }) => (
              <button key={page} onClick={() => setActive(page)}>
                <Icon size={16} />
                {label}
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </MotionCard>

        {/* Column 2 — role-specific */}
        {isAdmin ? (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>Reports</h2>
              </div>
              <GlassIcon tone="blue" size="2rem">
                <BarChart3 size={18} />
              </GlassIcon>
            </div>
            <div className="quick-list">
              {reports.map((report) => (
                <button key={report.name} onClick={() => setActive("courses")}>
                  <BarChart3 size={16} />
                  {report.title}
                  <Badge variant="info">{report.rows.length}</Badge>
                </button>
              ))}
            </div>
          </MotionCard>
        ) : isStudent ? (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>My Enrollment</h2>
              </div>
              <GlassIcon tone="blue" size="2rem">
                <GraduationCap size={18} />
              </GlassIcon>
            </div>
            <div className="mini-list">
              <div>
                <Badge variant="blue">Enrolled</Badge>
                <p>{enrolledCount} of 6 courses</p>
              </div>
              <div>
                <Badge variant={gradedSubmissions.length > 0 ? "safe" : "info"}>Graded</Badge>
                <p>{gradedSubmissions.length} submission{gradedSubmissions.length !== 1 ? "s" : ""} graded</p>
              </div>
              <div>
                <Badge variant={mySubmissions.length > 0 ? "blue" : "warn"}>Submitted</Badge>
                <p>{mySubmissions.length} total submission{mySubmissions.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </MotionCard>
        ) : (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>Upcoming Events</h2>
              </div>
            </div>
            <MiniList items={events.slice(0, 3).map((event) => [event.event_type, event.title, event.start_date])} />
          </MotionCard>
        )}

        {/* Column 3 — role-specific */}
        {isAdmin ? (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>System Overview</h2>
              </div>
            </div>
            <div className="mini-list">
              <div>
                <Badge variant="blue">Courses</Badge>
                <p>{courses.length} total courses</p>
              </div>
              <div>
                <Badge variant="safe">Reports</Badge>
                <p>{reports.length} report views available</p>
              </div>
              <div>
                <Badge variant="info">Enrollments</Badge>
                <p>{Object.values(members).reduce((sum, m) => sum + m.length, 0).toLocaleString()} total enrollments</p>
              </div>
            </div>
          </MotionCard>
        ) : isStudent ? (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>Upcoming Events</h2>
              </div>
            </div>
            <MiniList items={events.slice(0, 3).map((event) => [event.event_type, event.title, event.start_date])} />
          </MotionCard>
        ) : (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>Recent Content</h2>
              </div>
            </div>
            <MiniList
              items={content.slice(0, 3).map((item) => [item.content_type || "item", item.title || "Untitled", item.section_name])}
            />
          </MotionCard>
        )}

        {/* Bottom wide card — enrolled courses for student, all courses for others */}
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{isAdmin ? "All Courses" : isStudent ? "My Enrolled Courses" : "Available Courses"}</h2>
            </div>
          </div>
          <div className="course-list compact">
            {(isStudent ? myCourses : courses).slice(0, 6).map((course) => (
              <div className="course-row" key={course.course_code}>
                <div>
                  <Badge variant="blue">{course.course_code}</Badge>
                  <h3>{course.course_title}</h3>
                  <p>{course.course_description || "No description available."}</p>
                </div>
                <span>Lecturer {course.lecturer_id}</span>
              </div>
            ))}
            {isStudent && myCourses.length === 0 && (
              <EmptyState icon={BookOpen} title="No courses yet" children="Enroll in courses from Browse & Enroll." />
            )}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function MiniList({ items }: { items: [string, string, string | undefined | null][] }) {
  if (!items.length) return <EmptyState icon={FileText} title="Nothing yet" children="Create an item from this section." />;
  return (
    <div className="mini-list">
      {items.map(([badge, title, subtitle], index) => (
        <div key={`${title}-${index}`}>
          <Badge variant="info">{badge}</Badge>
          <p>{title}</p>
          <span>{subtitle}</span>
        </div>
      ))}
    </div>
  );
}

function Courses({
  mode,
  courses,
  selectedCourse,
  currentCourse,
  currentUser,
  members,
  courseTool,
  onToolChange,
  events,
  content,
  forums,
  selectedForum,
  selectedThread,
  threads,
  replies,
  assignments,
  submissions,
  reports,
  onSelect,
  onEnroll,
  onCreateCourse,
  onCreateEvent,
  onSelectForum,
  onSelectThread,
  onCreateForum,
  onCreateThread,
  onReply,
  onUpload,
  onSubmitAssignment,
  onGrade,
}: {
  mode: "all" | "mine" | "create";
  courses: Course[];
  selectedCourse: string;
  currentCourse?: Course;
  currentUser: User;
  members: Record<string, { student_id: number; full_name: string }[]>;
  courseTool: CourseTool;
  onToolChange: (tool: CourseTool) => void;
  events: EventRow[];
  content: CourseContent[];
  forums: Forum[];
  selectedForum?: Forum;
  selectedThread?: Thread;
  threads: Thread[];
  replies: Reply[];
  assignments: Assignment[];
  submissions: Submission[];
  reports: Report[];
  onSelect: (course: string) => void;
  onEnroll: (course: string) => Promise<void>;
  onCreateCourse: (course: Course) => Promise<void>;
  onCreateEvent: (event: EventRow) => Promise<void>;
  onSelectForum: (forumId: number) => void;
  onSelectThread: (threadId: number) => void;
  onCreateForum: (forum: { course_code: string; title: string; description?: string }) => Promise<void>;
  onCreateThread: (thread: Omit<Thread, "thread_id" | "created_by" | "reply_count" | "date_created">) => Promise<void>;
  onReply: (threadId: number, body: string, parentReplyId?: number) => Promise<void>;
  onUpload: (content: {
    course_code: string;
    section_id: number;
    lecturer_id: number;
    title: string;
    content_type: string;
    content_url: string;
  }) => Promise<void>;
  onSubmitAssignment: (assignment: Assignment, textAnswer: string) => Promise<void>;
  onGrade: (submissionId: number, score: number) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [draft, setDraft] = useState({
    course_code: "",
    course_title: "",
    lecturer_id: currentUser.role === "lecturer" ? currentUser.user_id : 45,
    course_description: "",
  });
  const isAllCourses = mode === "all";
  const isCreateMode = mode === "create";
  const activeCourse = courses.find((course) => course.course_code === selectedCourse);
  const canCreateCourse = currentUser.role === "admin";
  const lecturerId = activeCourse?.lecturer_id || currentCourse?.lecturer_id || currentUser.user_id;
  const courseTools = [
    { id: "overview", label: "Overview", icon: Layers3, show: true },
    { id: "members", label: "Members", icon: Users, show: true },
    { id: "calendar", label: "Calendar", icon: CalendarDays, show: true },
    { id: "forums", label: "Forums", icon: MessageSquareText, show: true },
    { id: "content", label: "Content", icon: FileText, show: true },
    { id: "assignments", label: "Assignments", icon: GraduationCap, show: true },
    { id: "reports", label: "Reports", icon: BarChart3, show: currentUser.role === "admin" },
  ].filter((tool) => tool.show) as { id: CourseTool; label: string; icon: LucideIcon; show: boolean }[];
  const filtered = courses.filter((course) =>
    `${course.course_code} ${course.course_title}`.toLowerCase().includes(query.toLowerCase())
  );
  const studentEnrolledCount = currentUser.role === "student"
    ? Object.values(members).filter((m) => m.some((s) => s.student_id === currentUser.user_id)).length
    : 0;
  const atMaxEnrollment = studentEnrolledCount >= 6;

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateCourse({ ...draft, course_code: draft.course_code.toUpperCase() });
    setDraft({ course_code: "", course_title: "", lecturer_id: currentUser.user_id, course_description: "" });
  };

  return (
    <>
      <PageHeader eyebrow="" title={isCreateMode ? "Create a Course" : "All Courses"}>
        {isCreateMode ? "Add a new course to the system." : "Select a course to manage its calendar, forums, content, and assignments."}
      </PageHeader>
      {!isCreateMode && <div className="toolbar">
        <div className="search-box glass-search-wrap">
          <div className="glass-filter" />
          <div className="glass-overlay" />
          <div className="glass-specular" />
          <div className="glass-search-inner">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses" />
          </div>
        </div>
      </div>}
      <div className={isCreateMode ? "" : isAllCourses && canCreateCourse ? "split-grid" : ""}>
        {(isCreateMode || (isAllCourses && canCreateCourse)) && (
          <MotionCard hover={false}>
            <div className="section-title">
              <div>
                <h2>Create Course</h2>
              </div>
            </div>
            <form className="form-stack" onSubmit={createCourse}>
              <label>
                Course Code
                <input value={draft.course_code} onChange={(event) => setDraft({ ...draft, course_code: event.target.value })} required />
              </label>
              <label>
                Course Title
                <input value={draft.course_title} onChange={(event) => setDraft({ ...draft, course_title: event.target.value })} required />
              </label>
              <label>
                Lecturer ID
                <input
                  type="number"
                  value={draft.lecturer_id}
                  onChange={(event) => setDraft({ ...draft, lecturer_id: Number(event.target.value) })}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={draft.course_description}
                  onChange={(event) => setDraft({ ...draft, course_description: event.target.value })}
                />
              </label>
              <GlassButton type="submit" variant="primary">
                <Plus size={16} />
                Create Course
              </GlassButton>
            </form>
          </MotionCard>
        )}

        {!isCreateMode && <div className="course-list">
          {filtered.map((course, index) => {
            const enrolled = Boolean(members[course.course_code]?.some((member) => member.student_id === currentUser.user_id));
            const openCourse = () => {
              onSelect(course.course_code);
              onToolChange("overview");
              setShowCourseModal(true);
            };
            return (
              <MotionCard key={course.course_code} delay={index * 0.03} className="course-card">
                <div
                  className="course-card-main clickable"
                  role="button"
                  tabIndex={0}
                  onClick={openCourse}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCourse();
                    }
                  }}
                >
                  <Badge variant={selectedCourse === course.course_code ? "safe" : "blue"}>{course.course_code}</Badge>
                  <h2>{course.course_title}</h2>
                  <p>{course.course_description || "No description available."}</p>
                </div>
                <div className="card-footer">
                  <span>{members[course.course_code]?.length || 0} enrolled</span>
                  {isAllCourses && currentUser.role === "student" && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <GlassButton disabled={enrolled || (!enrolled && atMaxEnrollment)} onClick={() => onEnroll(course.course_code)}>
                        {enrolled ? "Enrolled" : atMaxEnrollment ? "Max (6)" : `Enroll (${studentEnrolledCount}/6)`}
                      </GlassButton>
                    </span>
                  )}
                </div>
              </MotionCard>
            );
          })}
          {!filtered.length && (
            <EmptyState
              icon={BookOpen}
              title={isAllCourses ? "No courses found" : "No courses yet"}
              children={isAllCourses ? "Try a different search." : "Enroll in a course from All Courses to see it here."}
            />
          )}
        </div>}
      </div>
      <AnimatePresence>
        {showCourseModal && !isCreateMode && activeCourse && (
          <motion.div
            className="course-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCourseModal(false); }}
          >
            <motion.div
              className="course-modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="course-modal-header">
                <div>
                  <Badge variant="blue">{selectedCourse}</Badge>
                  <h2>{activeCourse.course_title}</h2>
                </div>
                <button className="icon-button" onClick={() => setShowCourseModal(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="course-tabs">
                {courseTools.map(({ id, label, icon: Icon }) => (
                  <button key={id} className={courseTool === id ? "active" : ""} onClick={() => onToolChange(id)}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="course-modal-body">
                {courseTool === "overview" && (
                  <div className="dashboard-grid">
                    <MotionCard hover={false}>
                      <h2>{activeCourse.course_title || selectedCourse}</h2>
                      <p>{activeCourse.course_description || "No description available."}</p>
                      <Badge variant="blue">{members[selectedCourse]?.length || 0} enrolled</Badge>
                    </MotionCard>
                    <MotionCard hover={false}>
                      <h2>Upcoming</h2>
                      <MiniList items={events.slice(0, 3).map((event) => [event.event_type, event.title, event.start_date])} />
                    </MotionCard>
                    <MotionCard hover={false}>
                      <h2>Materials</h2>
                      <MiniList items={content.slice(0, 3).map((item) => [item.content_type || "item", item.title || "Untitled", item.section_name])} />
                    </MotionCard>
                  </div>
                )}
                {courseTool === "members" && (
                  <MembersList members={members[selectedCourse] || []} selectedCourse={selectedCourse} />
                )}
                {courseTool === "calendar" && (
                  <Calendar
                    events={events}
                    selectedCourse={selectedCourse}
                    currentUser={currentUser}
                    lecturerId={lecturerId}
                    onCreateEvent={onCreateEvent}
                  />
                )}
                {courseTool === "forums" && (
                  <Forums
                    selectedCourse={selectedCourse}
                    currentUser={currentUser}
                    forums={forums}
                    selectedForum={selectedForum}
                    selectedThread={selectedThread}
                    threads={threads}
                    replies={replies}
                    onSelectForum={onSelectForum}
                    onSelectThread={onSelectThread}
                    onCreateForum={onCreateForum}
                    onCreateThread={onCreateThread}
                    onReply={onReply}
                  />
                )}
                {courseTool === "content" && (
                  <Content content={content} selectedCourse={selectedCourse} currentUser={currentUser} lecturerId={lecturerId} onUpload={onUpload} />
                )}
                {courseTool === "assignments" && (
                  <Assignments
                    assignments={assignments}
                    submissions={submissions}
                    currentUser={currentUser}
                    lecturerId={lecturerId}
                    onSubmitAssignment={onSubmitAssignment}
                    onGrade={onGrade}
                  />
                )}
                {courseTool === "reports" && currentUser.role === "admin" && <Reports reports={reports} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MembersList({ members, selectedCourse }: { members: { student_id: number; full_name: string }[]; selectedCourse: string }) {
  return (
    <>
      <PageHeader eyebrow="Members" title={`${selectedCourse} Members`}>
        Students enrolled in this course.
      </PageHeader>
      <MotionCard hover={false} className="wide-card">
        <div className="section-title">
          <div>
            <h2>{members.length} Enrolled Student{members.length !== 1 ? "s" : ""}</h2>
          </div>
          <GlassIcon tone="blue" size="2rem">
            <Users size={18} />
          </GlassIcon>
        </div>
        {members.length > 0 ? (
          <div className="mini-list">
            {members.map((m) => (
              <div key={m.student_id}>
                <Badge variant="blue">{m.student_id}</Badge>
                <p>{m.full_name}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Users} title="No members" children="No students are enrolled in this course yet." />
        )}
      </MotionCard>
    </>
  );
}

function Calendar({
  events,
  selectedCourse,
  currentUser,
  lecturerId,
  onCreateEvent,
}: {
  events: EventRow[];
  selectedCourse: string;
  currentUser: User;
  lecturerId: number;
  onCreateEvent: (event: EventRow) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: "",
    event_type: "lecture" as EventRow["event_type"],
    start_date: "2026-05-20 09:00:00",
    end_date: "2026-05-20 10:30:00",
    description: "",
  });
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyEvents, setDailyEvents] = useState<EventRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const canCreateEvent = currentUser.role === "lecturer" && currentUser.user_id === lecturerId;
  const isStudent = currentUser.role === "student";

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateEvent({ ...draft, course_code: selectedCourse, lecturer_id: lecturerId });
    setDraft({ ...draft, title: "", description: "" });
  };

  const fetchDailyEvents = async () => {
    setDailyLoading(true);
    try {
      const result = await api.getStudentDailyEvents(currentUser.user_id, dailyDate);
      setDailyEvents(result.events);
    } catch {
      setDailyEvents([]);
    }
    setDailyLoading(false);
  };

  return (
    <>
      <PageHeader eyebrow="Calendar" title={`${selectedCourse} Events`}>
        Lectures, tutorials, labs, and exams.
      </PageHeader>
      {isStudent && (
        <MotionCard hover={false} className="wide-card daily-schedule-card">
          <div className="section-title">
            <div>
              <h2>My Daily Schedule</h2>
              <p>View all your events across enrolled courses for a specific date.</p>
            </div>
          </div>
          <div className="daily-schedule-form">
            <label>
              Date
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            </label>
            <GlassButton variant="primary" onClick={fetchDailyEvents} disabled={dailyLoading}>
              <Search size={16} />
              {dailyLoading ? "Loading..." : "Find Events"}
            </GlassButton>
          </div>
          {dailyEvents.length > 0 && (
            <div className="timeline daily-schedule-results">
              {dailyEvents.map((event, index) => (
                <div className="timeline-row" key={`daily-${event.title}-${index}`}>
                  <span />
                  <div>
                    <Badge variant={event.event_type === "exam" ? "danger" : "info"}>{event.event_type}</Badge>
                    <h3>{event.title}</h3>
                    <Badge variant="blue">{event.course_code}</Badge>
                    <p>{event.description || "No description provided."}</p>
                    <small>{event.start_date} to {event.end_date}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {dailyEvents.length === 0 && !dailyLoading && (
            <p className="daily-schedule-empty">No events found. Select a date and click Find Events.</p>
          )}
        </MotionCard>
      )}
      <div className={canCreateEvent ? "split-grid" : ""}>
        {canCreateEvent && (
          <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Create Event</h2>
            </div>
          </div>
            <form className="form-stack" onSubmit={create}>
              <label>
                Title
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
              </label>
              <label>
                Event Type
                <select
                  value={draft.event_type}
                  onChange={(event) => setDraft({ ...draft, event_type: event.target.value as EventRow["event_type"] })}
                >
                  <option value="lecture">Lecture</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="lab">Lab</option>
                  <option value="exam">Exam</option>
                </select>
              </label>
              <label>
                Start
                <input value={draft.start_date} onChange={(event) => setDraft({ ...draft, start_date: event.target.value })} />
              </label>
              <label>
                End
                <input value={draft.end_date} onChange={(event) => setDraft({ ...draft, end_date: event.target.value })} />
              </label>
              <label>
                Description
                <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <GlassButton type="submit" variant="primary">
                <CalendarDays size={16} />
                Save Event
              </GlassButton>
            </form>
          </MotionCard>
        )}
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{selectedCourse} Timeline</h2>
            </div>
          </div>
          <div className="timeline">
            {events.map((event, index) => (
              <div className="timeline-row" key={`${event.title}-${index}`}>
                <span />
                <div>
                  <Badge variant={event.event_type === "exam" ? "danger" : "info"}>{event.event_type}</Badge>
                  <h3>{event.title}</h3>
                  <p>{event.description || "No description provided."}</p>
                  <small>
                    {event.start_date} to {event.end_date}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function ReplyNode({
  reply,
  allReplies,
  depth,
  onReply,
}: {
  reply: Reply;
  allReplies: Reply[];
  depth: number;
  onReply: (parentReplyId: number, body: string) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [body, setBody] = useState("");
  const children = allReplies.filter((r) => r.parent_reply_id === reply.reply_id);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onReply(reply.reply_id, body);
    setBody("");
    setShowReplyBox(false);
  };

  return (
    <div className="nested-reply" style={{ marginLeft: Math.min(depth, 4) * 16 }}>
      <div className="reply-item">
        <Badge variant="info">User {reply.user_id}</Badge>
        <p>{reply.body}</p>
        <span>{reply.date_created}</span>
        <button type="button" className="reply-link" onClick={() => setShowReplyBox(!showReplyBox)}>Reply</button>
      </div>
      {showReplyBox && (
        <form className="reply-box" onSubmit={submit}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply..." required />
          <button className="icon-button" type="submit" aria-label="Send reply">
            <Send size={16} />
          </button>
        </form>
      )}
      {children.map((child) => (
        <ReplyNode key={child.reply_id} reply={child} allReplies={allReplies} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
}

function Forums({
  selectedCourse,
  currentUser,
  forums,
  selectedForum,
  selectedThread,
  threads,
  replies,
  onSelectForum,
  onSelectThread,
  onCreateForum,
  onCreateThread,
  onReply,
}: {
  selectedCourse: string;
  currentUser: User;
  forums: Forum[];
  selectedForum?: Forum;
  selectedThread?: Thread;
  threads: Thread[];
  replies: Reply[];
  onSelectForum: (forumId: number) => void;
  onSelectThread: (threadId: number) => void;
  onCreateForum: (forum: { course_code: string; title: string; description?: string }) => Promise<void>;
  onCreateThread: (thread: Omit<Thread, "thread_id" | "created_by" | "reply_count" | "date_created">) => Promise<void>;
  onReply: (threadId: number, body: string, parentReplyId?: number) => Promise<void>;
}) {
  const [forumTitle, setForumTitle] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const canManageForums = currentUser.role === "admin" || currentUser.role === "lecturer";
  const topLevelReplies = replies.filter((r) => !r.parent_reply_id);

  const createForum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateForum({ course_code: selectedCourse, title: forumTitle, description: `${selectedCourse} discussion forum` });
    setForumTitle("");
  };

  const createThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedForum) return;
    await onCreateThread({
      forum_id: selectedForum.forum_id,
      title: threadTitle,
      initial_post: threadBody,
      user_id: currentUser.user_id,
    });
    setThreadTitle("");
    setThreadBody("");
  };

  const replyToThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedThread) return;
    await onReply(selectedThread.thread_id, replyBody);
    setReplyBody("");
  };

  const replyToReply = (parentReplyId: number, body: string) => {
    if (!selectedThread) return;
    void onReply(selectedThread.thread_id, body, parentReplyId);
  };

  return (
    <>
      <PageHeader eyebrow="Forums" title={`${selectedCourse} Forums`}>
        Discussions and replies.
      </PageHeader>
      <div className="split-grid">
        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Course Forums</h2>
            </div>
          </div>
          {canManageForums ? (
            <form className="reply-box" onSubmit={createForum}>
              <input value={forumTitle} onChange={(event) => setForumTitle(event.target.value)} placeholder="New forum title" required />
              <button className="icon-button" type="submit" aria-label="Create forum">
                <Plus size={16} />
              </button>
            </form>
          ) : null}
          <div className="quick-list">
            {forums.map((forum) => (
              <button
                key={forum.forum_id}
                onClick={() => onSelectForum(forum.forum_id)}
                className={selectedForum?.forum_id === forum.forum_id ? "selected" : ""}
              >
                <MessageSquareText size={16} />
                {forum.title}
                <Badge variant="info">{threads.filter((thread) => thread.forum_id === forum.forum_id).length}</Badge>
              </button>
            ))}
          </div>
        </MotionCard>
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{selectedForum?.title || "Threads"}</h2>
            </div>
          </div>
          <form className="form-stack compact-form" onSubmit={createThread}>
            <input value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)} placeholder="Thread title" required />
            <input value={threadBody} onChange={(event) => setThreadBody(event.target.value)} placeholder="Initial post" required />
            <GlassButton type="submit" variant="primary" disabled={!selectedForum}>
              <Plus size={16} />
              Start Thread
            </GlassButton>
          </form>
          <div className="thread-list">
            {threads.map((thread) => (
              <button
                type="button"
                key={thread.thread_id}
                className={`thread-card thread-button ${selectedThread?.thread_id === thread.thread_id ? "selected" : ""}`}
                onClick={() => onSelectThread(thread.thread_id)}
              >
                <div>
                  <h3>{thread.title}</h3>
                  <p>{thread.initial_post}</p>
                  <span>{thread.created_by || `User ${thread.user_id}`}</span>
                </div>
                <Badge variant="blue">{thread.reply_count || 0} replies</Badge>
              </button>
            ))}
          </div>
          {selectedThread && (
            <div className="reply-panel">
              <h3>{selectedThread.title}</h3>
              <p>{selectedThread.initial_post}</p>
              <div className="nested-replies">
                {topLevelReplies.map((item) => (
                  <ReplyNode key={item.reply_id} reply={item} allReplies={replies} depth={0} onReply={replyToReply} />
                ))}
              </div>
              <form className="reply-box" onSubmit={replyToThread}>
                <input value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Reply to thread..." required />
                <button className="icon-button" type="submit" aria-label="Send reply">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </MotionCard>
      </div>
    </>
  );
}

function Content({
  content,
  selectedCourse,
  currentUser,
  lecturerId,
  onUpload,
}: {
  content: CourseContent[];
  selectedCourse: string;
  currentUser: User;
  lecturerId: number;
  onUpload: (content: {
    course_code: string;
    section_id: number;
    lecturer_id: number;
    title: string;
    content_type: string;
    content_url: string;
  }) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ section_id: 1, title: "", content_type: "slide", content_url: "" });
  const canUploadContent = currentUser.role === "lecturer" && currentUser.user_id === lecturerId;
  const iconFor = (type: CourseContent["content_type"]) => {
    if (type === "slide") return Presentation;
    if (type === "video") return Video;
    if (type === "file") return FileText;
    return LinkIcon;
  };
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onUpload({ ...draft, course_code: selectedCourse, lecturer_id: lecturerId });
    setDraft({ ...draft, title: "", content_url: "" });
  };

  return (
    <>
      <PageHeader eyebrow="Course Content" title={`${selectedCourse} Materials`}>
        Course materials by section.
      </PageHeader>
      <div className={canUploadContent ? "split-grid" : ""}>
        {canUploadContent && (
          <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Upload Content</h2>
            </div>
          </div>
            <form className="form-stack" onSubmit={upload}>
              <label>
                Section ID
                <input
                  type="number"
                  value={draft.section_id}
                  onChange={(event) => setDraft({ ...draft, section_id: Number(event.target.value) })}
                />
              </label>
              <label>
                Title
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
              </label>
              <label>
                Content Type
                <select value={draft.content_type} onChange={(event) => setDraft({ ...draft, content_type: event.target.value })}>
                  <option value="link">Link</option>
                  <option value="file">File</option>
                  <option value="slide">Slide</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <label>
                URL
                <input value={draft.content_url} onChange={(event) => setDraft({ ...draft, content_url: event.target.value })} required />
              </label>
              <GlassButton type="submit" variant="primary">
                <Plus size={16} />
                Upload
              </GlassButton>
            </form>
          </MotionCard>
        )}
        <MotionCard hover={false} className="wide-card">
          <div className="content-grid">
            {content.length ? (
              content.map((item, index) => {
                const Icon = iconFor(item.content_type);
                return (
                  <div className="content-item" key={`${item.title}-${index}`}>
                    <Icon size={18} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.section_name}</p>
                    </div>
                    <Badge variant="info">{item.content_type || "item"}</Badge>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={FileText} title="No content yet" children="Upload material to populate this course." />
            )}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function Assignments({
  assignments,
  submissions,
  currentUser,
  lecturerId,
  onSubmitAssignment,
  onGrade,
}: {
  assignments: Assignment[];
  submissions: Submission[];
  currentUser: User;
  lecturerId: number;
  onSubmitAssignment: (assignment: Assignment, textAnswer: string) => Promise<void>;
  onGrade: (submissionId: number, score: number) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<number, number>>({});

  return (
    <>
      <PageHeader eyebrow="Assignments" title="Submissions and Grades">
        Students submit work for the selected course; lecturers review submissions and enter grades.
      </PageHeader>
      <div className="dashboard-grid">
        {assignments.map((assignment, index) => {
          const mine = submissions.find(
            (submission) => submission.assignment_id === assignment.assignment_id && submission.student_id === currentUser.user_id
          );
          const relatedSubmissions = submissions.filter((submission) => submission.assignment_id === assignment.assignment_id);
          return (
            <MotionCard key={assignment.assignment_id} delay={index * 0.05} hover={false} className="assignment-card">
              <Badge variant={mine?.submission_status === "graded" ? "safe" : mine ? "blue" : "warn"}>
                {mine?.submission_status || "open"}
              </Badge>
              <h2>{assignment.title}</h2>
              <p>{assignment.description}</p>
              <span>
                Due {assignment.due_date || "TBA"} / {assignment.total_marks} marks
              </span>
              {currentUser.role === "student" && (
                <form
                  className="form-stack compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onSubmitAssignment(assignment, answers[assignment.assignment_id] || "");
                  }}
                >
                  <input
                    value={answers[assignment.assignment_id] || ""}
                    onChange={(event) => setAnswers({ ...answers, [assignment.assignment_id]: event.target.value })}
                    placeholder="Paste text answer or file link"
                    required
                  />
                  <GlassButton type="submit" variant="primary">
                    <Send size={16} />
                    Submit
                  </GlassButton>
                </form>
              )}
              {currentUser.role !== "student" && (
                <div className="mini-list">
                  {relatedSubmissions.length ? (
                    relatedSubmissions.map((submission) => (
                      <div key={submission.submission_id}>
                        <Badge variant={submission.score != null ? "safe" : "blue"}>
                          {submission.score != null ? `${submission.score}` : "submitted"}
                        </Badge>
                        <p>{submission.full_name || `Student ${submission.student_id}`}</p>
                        <span>{submission.text_answer || submission.file_url}</span>
                        {currentUser.user_id === lecturerId && (
                          <form
                            className="reply-box"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void onGrade(submission.submission_id, scores[submission.submission_id] || 0);
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              max={assignment.total_marks}
                              value={scores[submission.submission_id] || ""}
                              onChange={(event) =>
                                setScores({ ...scores, [submission.submission_id]: Number(event.target.value) })
                              }
                              placeholder="Score"
                              required
                            />
                            <button className="icon-button" type="submit" aria-label="Save grade">
                              <CheckCircle2 size={16} />
                            </button>
                          </form>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No submissions yet.</p>
                  )}
                </div>
              )}
            </MotionCard>
          );
        })}
      </div>
    </>
  );
}

function Reports({ reports }: { reports: Report[] }) {
  return (
    <>
      <PageHeader eyebrow="Reports" title="SQL View Dashboard">
        Report views surface enrollment load, lecturer load, high-enrollment courses, and top student averages.
      </PageHeader>
      <div className="report-grid">
        {reports.map((report, index) => (
          <MotionCard key={report.name} delay={index * 0.04} hover={false} className="report-card">
            <BarChart3 size={22} />
            <h2>{report.title}</h2>
            <p>{report.rows.length} rows returned.</p>
            <code>{report.name}</code>
            <div className="mini-list report-rows">
              {report.rows.slice(0, 3).map((row, rowIndex) => (
                <div key={`${report.name}-${rowIndex}`}>
                  <p>{Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(" | ")}</p>
                </div>
              ))}
            </div>
          </MotionCard>
        ))}
      </div>
    </>
  );
}

function RegisterUser() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<User["role"]>("student");
  const [passwordHash, setPasswordHash] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      await api.createUser({
        user_id: 0,
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        password_hash: passwordHash,
      });
      setStatus("success");
      setMessage(`${role} account created for ${email.trim()}`);
      setEmail("");
      setFullName("");
      setPasswordHash("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  return (
    <>
      <PageHeader eyebrow="" title="Register User">
        Create a new student, lecturer, or admin account.
      </PageHeader>
      <div style={{ maxWidth: "480px" }}>
        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>New Account</h2>
            </div>
            <GlassIcon tone="blue" size="2.35rem">
              <UserPlus size={18} />
            </GlassIcon>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Full Name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as User["role"])}>
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Password
              <input value={passwordHash} onChange={(e) => setPasswordHash(e.target.value)} required />
            </label>
            {message && (
              <Notice type={status === "success" ? "success" : "warn"}>{message}</Notice>
            )}
            <GlassButton type="submit" variant="primary" disabled={status === "loading"}>
              {status === "loading" ? <GlassSpinner size={18} /> : <UserPlus size={16} />}
              Create Account
            </GlassButton>
          </form>
        </MotionCard>
      </div>
    </>
  );
}

export default App;
