import { sendDueReminders } from "../src/features/notifications/reminders";

async function main() {
  const r = await sendDueReminders();
  console.log(
    `reminders: checked=${r.checked} sent=${r.sent} skipped=${r.skipped} failed=${r.failed}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
