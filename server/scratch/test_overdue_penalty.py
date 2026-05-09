from tasks.email_cron import check_and_send_overdue_reminders
import logging

# Setup logging to see output
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    print("🚀 Simulating Daily Overdue Check and Point Deduction...")
    check_and_send_overdue_reminders()
    print("✨ Simulation Complete.")
