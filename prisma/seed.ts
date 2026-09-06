import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// AttendTrack ships with NO demo employees so a client gets a clean,
// empty app on day one — every employee they see is one they added
// themselves via "Add Employee". This script only verifies the
// database connection; it never inserts sample data.
//
// (If you're developing locally and want sample data to click around
// with, add your own employees in prisma/seed.ts and re-run
// `npm run prisma:seed` — nothing here does that automatically.)
async function main() {
  const count = await prisma.employee.count();
  console.log(
    count === 0
      ? "Database is empty — ready for a fresh client. Add employees from the app's 'Add Employee' tab."
      : `Database already has ${count} employee(s) — nothing to seed.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

