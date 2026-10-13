/**
 * Database seed — deterministic, idempotent demo dataset.
 *
 * Run with: npm run db:seed
 * It wipes existing rows and recreates a small but realistic institution:
 * 3 faculties, 4 departments, 4 programmes, 2 sessions, courses, staff,
 * students, enrolments, assessments, scores, attendance, fees and announcements.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password1"; // shared demo password for every seeded account

async function wipe() {
  // Order matters: children before parents.
  await prisma.gradeHistory.deleteMany();
  await prisma.score.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.courseAssignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.gradingRule.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Seeding database…");
  await wipe();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- Grading rules (configurable) ------------------------------------
  await prisma.gradingRule.createMany({
    data: [
      { setName: "default", minScore: 70, maxScore: 100, grade: "A", points: 5 },
      { setName: "default", minScore: 60, maxScore: 69.999, grade: "B", points: 4 },
      { setName: "default", minScore: 50, maxScore: 59.999, grade: "C", points: 3 },
      { setName: "default", minScore: 45, maxScore: 49.999, grade: "D", points: 2 },
      { setName: "default", minScore: 40, maxScore: 44.999, grade: "E", points: 1 },
      { setName: "default", minScore: 0, maxScore: 39.999, grade: "F", points: 0 },
    ],
  });

  // --- Faculties / departments / programmes ----------------------------
  const science = await prisma.faculty.create({
    data: { name: "Faculty of Science", code: "SCI", description: "Natural and computing sciences" },
  });
  const engineering = await prisma.faculty.create({
    data: { name: "Faculty of Engineering", code: "ENG", description: "Engineering and technology" },
  });
  const arts = await prisma.faculty.create({
    data: { name: "Faculty of Arts", code: "ART", description: "Humanities and languages" },
  });

  const cs = await prisma.department.create({
    data: { name: "Computer Science", code: "CSC", facultyId: science.id },
  });
  const maths = await prisma.department.create({
    data: { name: "Mathematics", code: "MTH", facultyId: science.id },
  });
  const eee = await prisma.department.create({
    data: { name: "Electrical Engineering", code: "EEE", facultyId: engineering.id },
  });
  const english = await prisma.department.create({
    data: { name: "English", code: "ENL", facultyId: arts.id },
  });

  const bscCs = await prisma.program.create({
    data: { name: "B.Sc Computer Science", code: "BSC-CS", departmentId: cs.id, level: "100-400" },
  });
  const bscMth = await prisma.program.create({
    data: { name: "B.Sc Mathematics", code: "BSC-MTH", departmentId: maths.id, level: "100-400" },
  });
  const bengEee = await prisma.program.create({
    data: { name: "B.Eng Electrical Engineering", code: "BENG-EEE", departmentId: eee.id, level: "100-500" },
  });
  const baEng = await prisma.program.create({
    data: { name: "B.A English", code: "BA-ENG", departmentId: english.id, level: "100-400" },
  });

  // --- Academic sessions & semesters -----------------------------------
  const session2425 = await prisma.academicSession.create({
    data: {
      name: "2024/2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-07-31"),
      isCurrent: false,
    },
  });
  const session2526 = await prisma.academicSession.create({
    data: {
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-31"),
      isCurrent: true,
    },
  });

  await prisma.semester.createMany({
    data: [
      { name: "First Semester", sessionId: session2425.id, startDate: new Date("2024-09-01"), endDate: new Date("2025-01-15"), isCurrent: false },
      { name: "Second Semester", sessionId: session2425.id, startDate: new Date("2025-02-01"), endDate: new Date("2025-07-15"), isCurrent: false },
      { name: "First Semester", sessionId: session2526.id, startDate: new Date("2025-09-01"), endDate: new Date("2026-01-15"), isCurrent: true },
      { name: "Second Semester", sessionId: session2526.id, startDate: new Date("2026-02-01"), endDate: new Date("2026-07-15"), isCurrent: false },
    ],
  });

  const sem1 = await prisma.semester.findFirstOrThrow({
    where: { sessionId: session2526.id, name: "First Semester" },
  });

  // --- Admin user -------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      email: "admin@school.edu",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // --- Lecturers --------------------------------------------------------
  const lecturerUsers = await Promise.all(
    [
      { email: "ada.okoro@school.edu", firstName: "Ada", lastName: "Okoro", staffId: "STF-2026-0001", departmentId: cs.id },
      { email: "john.mensah@school.edu", firstName: "John", lastName: "Mensah", staffId: "STF-2026-0002", departmentId: maths.id },
      { email: "grace.adeyemi@school.edu", firstName: "Grace", lastName: "Adeyemi", staffId: "STF-2026-0003", departmentId: eee.id },
    ].map(async (s) =>
      prisma.user.create({
        data: {
          email: s.email,
          passwordHash,
          role: "LECTURER",
          status: "ACTIVE",
          staffProfile: {
            create: {
              staffId: s.staffId,
              firstName: s.firstName,
              lastName: s.lastName,
              departmentId: s.departmentId,
              phone: "+2348000000000",
            },
          },
        },
        include: { staffProfile: true },
      }),
    ),
  );
  const [ada, john, grace] = lecturerUsers;

  // --- Courses ----------------------------------------------------------
  const courseData = [
    { code: "CSC101", title: "Introduction to Programming", departmentId: cs.id, level: "100", creditUnits: 3, semesterId: sem1.id, lecturer: ada.staffProfile!.id, venue: "LT-1", scheduleDays: "MON,WED", startTime: "09:00", endTime: "11:00" },
    { code: "CSC201", title: "Data Structures and Algorithms", departmentId: cs.id, level: "200", creditUnits: 4, semesterId: sem1.id, lecturer: ada.staffProfile!.id, venue: "LT-2", scheduleDays: "TUE,THU", startTime: "11:00", endTime: "13:00" },
    { code: "CSC301", title: "Operating Systems", departmentId: cs.id, level: "300", creditUnits: 3, semesterId: sem1.id, lecturer: john.staffProfile!.id, venue: "LAB-3", scheduleDays: "WED,FRI", startTime: "14:00", endTime: "16:00" },
    { code: "MTH101", title: "Elementary Calculus", departmentId: maths.id, level: "100", creditUnits: 3, semesterId: sem1.id, lecturer: john.staffProfile!.id, venue: "LT-4", scheduleDays: "MON,FRI", startTime: "08:00", endTime: "10:00" },
    { code: "EEE201", title: "Circuit Theory", departmentId: eee.id, level: "200", creditUnits: 4, semesterId: sem1.id, lecturer: grace.staffProfile!.id, venue: "LAB-1", scheduleDays: "TUE,THU", startTime: "08:00", endTime: "10:00" },
  ];

  const courses = await Promise.all(
    courseData.map((c) =>
      prisma.course.create({
        data: {
          code: c.code,
          title: c.title,
          description: `${c.title} — lecture and laboratory work.`,
          creditUnits: c.creditUnits,
          departmentId: c.departmentId,
          level: c.level,
          venue: c.venue,
          scheduleDays: c.scheduleDays,
          startTime: c.startTime,
          endTime: c.endTime,
          semesterId: c.semesterId,
          assignments: { create: { staffId: c.lecturer, sessionId: session2526.id } },
        },
      }),
    ),
  );
  const [csc101, csc201, csc301, mth101] = courses;

  // --- Assessments ------------------------------------------------------
  const assessmentTemplate = [
    { type: "ASSIGNMENT", title: "Assignment 1", maxScore: 20, weight: 20 },
    { type: "TEST", title: "Mid-Semester Test", maxScore: 30, weight: 20 },
    { type: "EXAM", title: "Final Examination", maxScore: 70, weight: 60 },
  ];

  for (const course of courses) {
    await prisma.assessment.createMany({
      data: assessmentTemplate.map((a) => ({
        courseId: course.id,
        type: a.type,
        title: a.title,
        maxScore: a.maxScore,
        weight: a.weight,
        isPublished: false,
        dueDate: new Date("2026-01-10"),
      })),
    });
  }

  // --- Students ---------------------------------------------------------
  const firstNames = ["Chinedu", "Amina", "Tunde", "Fatima", "Emeka", "Zainab", "Bola", "Ifeoma", "Yusuf", "Ngozi", "Samuel", "Halima"];
  const lastNames = ["Okafor", "Bello", "Adeyemi", "Ibrahim", "Nwosu", "Sani", "Balogun", "Eze", "Mohammed", "Chukwu", "Adeleke", "Garba"];
  const programmeDept = [
    { programId: bscCs.id, departmentId: cs.id, facultyId: science.id },
    { programId: bscMth.id, departmentId: maths.id, facultyId: science.id },
    { programId: bengEee.id, departmentId: eee.id, facultyId: engineering.id },
    { programId: baEng.id, departmentId: english.id, facultyId: arts.id },
  ];

  const students = await Promise.all(
    firstNames.map(async (first, i) => {
      const last = lastNames[i];
      const mapping = programmeDept[i % programmeDept.length];
      const level = ["100", "200", "300"][i % 3];
      const studentId = `STU-2026-${String(i + 1).padStart(4, "0")}`;
      return prisma.user.create({
        data: {
          email: `${first.toLowerCase()}.${last.toLowerCase()}@student.school.edu`,
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          studentProfile: {
            create: {
              studentId,
              firstName: first,
              lastName: last,
              phone: `+23480${String(10000000 + i).slice(0, 8)}`,
              gender: i % 2 === 0 ? "MALE" : "FEMALE",
              address: `${i + 1} University Road`,
              dateOfBirth: new Date(2003 + (i % 3), i % 12, (i % 27) + 1),
              facultyId: mapping.facultyId,
              departmentId: mapping.departmentId,
              programId: mapping.programId,
              level,
              sessionId: session2526.id,
              admissionDate: new Date("2025-09-01"),
              status: "ACTIVE",
              emergencyContact: "+2348111111111",
            },
          },
        },
        include: { studentProfile: true },
      });
    }),
  );

  // --- Enrolments, scores, attendance, fees ----------------------------
  const enrolCourses = [csc101, csc201, csc301, mth101];
  const attendanceDates = ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"].map((d) => new Date(d));

  let scoreSeed = 0;
  for (const student of students) {
    const profileId = student.studentProfile!.id;
    const count = 2 + (scoreSeed % 2); // 2–3 courses per student

    for (let k = 0; k < count; k += 1) {
      const course = enrolCourses[(scoreSeed + k) % enrolCourses.length];
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: profileId,
          courseId: course.id,
          sessionId: session2526.id,
          semesterId: sem1.id,
          status: "ACTIVE",
        },
      });

      const assessments = await prisma.assessment.findMany({ where: { courseId: course.id } });
      for (const assessment of assessments) {
        // Deterministic pseudo-score spread across the valid range.
        const ratio = 0.45 + (((scoreSeed * 7 + assessment.title.length) % 50) / 100);
        await prisma.score.create({
          data: {
            assessmentId: assessment.id,
            enrollmentId: enrollment.id,
            rawScore: Math.round(ratio * assessment.maxScore * 100) / 100,
            enteredById: ada.staffProfile!.id,
          },
        });
      }

      for (const [di, date] of attendanceDates.entries()) {
        const statuses = ["PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"];
        await prisma.attendance.create({
          data: {
            enrollmentId: enrollment.id,
            date,
            status: statuses[(scoreSeed + k + di) % statuses.length],
            markedBy: ada.staffProfile!.id,
          },
        });
      }
    }

    const amountDue = 250000;
    const paid = (scoreSeed % 3) * 100000;
    const fee = await prisma.fee.create({
      data: {
        studentId: profileId,
        sessionId: session2526.id,
        amountDue,
        amountPaid: paid,
        status: paid === 0 ? "UNPAID" : paid >= amountDue ? "PAID" : "PARTIAL",
        dueDate: new Date("2025-11-30"),
      },
    });
    if (paid > 0) {
      await prisma.payment.create({
        data: {
          feeId: fee.id,
          amount: paid,
          method: "BANK_TRANSFER",
          reference: `PAY-${profileId.slice(-6)}-${scoreSeed}`,
          recordedBy: admin.id,
        },
      });
    }

    scoreSeed += 1;
  }

  // --- Announcements ----------------------------------------------------
  await prisma.announcement.createMany({
    data: [
      {
        title: "First Semester examinations timetable published",
        body: "The examination timetable for the current semester is now available. Please check your course pages for details.",
        audience: "ALL",
        authorId: admin.id,
      },
      {
        title: "Fee payment deadline",
        body: "Tuition fees for the 2025/2026 session are due on 30 November. Please ensure your payments are recorded.",
        audience: "STUDENT",
        authorId: admin.id,
      },
      {
        title: "Grade entry window open",
        body: "Lecturers may now enter and publish assessment scores for the current semester.",
        audience: "LECTURER",
        authorId: admin.id,
      },
    ],
  });

  console.log(`Seed complete (${students.length} students, ${courses.length} courses).`);
  console.log(`Admin login: admin@school.edu / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
