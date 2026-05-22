import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import settings


def _build_html(task_name: str, task_id: int, created_at: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.12);">
        <!-- Header -->
        <tr>
          <td style="background:#4a154b;padding:16px 24px;display:flex;align-items:center;">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">InApps License Web</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 4px;font-size:13px;color:#616061;">New task created in</p>
            <p style="margin:0 0 20px;font-size:13px;color:#1d1c1d;font-weight:600;">#IT Service</p>

            <div style="border-left:4px solid #4f46e5;padding:12px 16px;background:#f8f7ff;border-radius:0 6px 6px 0;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1d1c1d;">{task_name}</p>
              <p style="margin:0;font-size:12px;color:#616061;">Task #{task_id} &nbsp;·&nbsp; {created_at}</p>
            </div>

            <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e8e8e8;padding-top:16px;margin-top:4px;">
              <tr>
                <td style="font-size:12px;color:#616061;">Created by</td>
                <td align="right" style="font-size:12px;color:#1d1c1d;font-weight:500;">InApps License Web</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#616061;padding-top:6px;">Project</td>
                <td align="right" style="font-size:12px;color:#1d1c1d;font-weight:500;padding-top:6px;">IT Service</td>
              </tr>
            </table>

            <div style="margin-top:20px;text-align:center;">
              <a href="https://erp.inapps.net/odoo/project/task/{task_id}"
                 style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;
                        font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
                Mở task trong Odoo ↗
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:12px 24px;background:#f8f8f8;border-top:1px solid #e8e8e8;">
            <p style="margin:0;font-size:11px;color:#999;">You received this notification from InApps Software License system.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_task_notification(task_name: str, task_id: int) -> None:
    if not settings.smtp_user or not settings.smtp_password:
        return

    created_at = datetime.now().strftime("%d/%m/%Y %H:%M")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[IT Service] New task: {task_name}"
    msg["From"] = f"InApps License Web <{settings.smtp_user}>"
    msg["To"] = settings.smtp_to

    msg.attach(MIMEText(_build_html(task_name, task_id, created_at), "html", "utf-8"))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.sendmail(settings.smtp_user, settings.smtp_to, msg.as_string())
