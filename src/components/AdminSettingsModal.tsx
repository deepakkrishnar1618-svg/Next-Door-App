import { useState, useEffect } from "react";
import { X, Download, FileText, FileSpreadsheet, Mail, Clock, Users, Check, Send, ExternalLink, Archive } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";
import JSZip from "jszip";

interface UserForSelection {
  id: string;
  name: string;
  email: string;
  room_number: string;
  avatar_url: string | null;
  is_active: number;
}

interface AdminSettingsModalProps {
  onClose: () => void;
}

export default function AdminSettingsModal({ onClose }: AdminSettingsModalProps) {
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showClearMessagesConfirm, setShowClearMessagesConfirm] = useState(false);
  const [monthsOld, setMonthsOld] = useState("6");
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Email notification settings
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTime, setEmailTime] = useState("18:00");
  const [isLoadingEmailSettings, setIsLoadingEmailSettings] = useState(true);
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);

  // Schedule settings
  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
  const DAY_LABELS: Record<string, string> = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
  const [sendDays, setSendDays] = useState<string[]>(['monday']);
  const [sendTime, setSendTime] = useState('09:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  
  // User selection for email notifications
  const [allUsers, setAllUsers] = useState<UserForSelection[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSavingRecipients, setIsSavingRecipients] = useState(false);
  
  // Immediate notification
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    fetchEmailSettings();
    fetchUsersAndRecipients();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      const [emailRes, scheduleRes] = await Promise.all([
        fetch("/api/admin/email-settings", { credentials: 'include' }),
        fetch("/api/admin/settings", { credentials: 'include' }),
      ]);
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailEnabled(data.enabled);
        setEmailTime(data.time);
      }
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        if (Array.isArray(data.email_send_days)) setSendDays(data.email_send_days);
        if (data.email_send_time) setSendTime(data.email_send_time);
      }
    } catch (err) {
      console.error("Failed to fetch email settings:", err);
    } finally {
      setIsLoadingEmailSettings(false);
    }
  };

  const fetchUsersAndRecipients = async () => {
    try {
      // Fetch all users
      const usersResponse = await fetch("/api/users", {
        credentials: 'include',
      });
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        // Filter to only show active users with completed profiles
        const activeUsers = users.filter((u: UserForSelection) => 
          u.is_active === 1 && u.name && u.email
        );
        setAllUsers(activeUsers);
      }

      // Fetch selected recipients
      const recipientsResponse = await fetch("/api/admin/email-recipients", {
        credentials: 'include',
      });
      if (recipientsResponse.ok) {
        const data = await recipientsResponse.json();
        setSelectedUserIds(new Set(data.user_ids));
      }
    } catch (err) {
      console.error("Failed to fetch users/recipients:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === allUsers.length) {
      // Deselect all
      setSelectedUserIds(new Set());
    } else {
      // Select all
      setSelectedUserIds(new Set(allUsers.map(u => u.id)));
    }
  };

  const handleSaveRecipients = async () => {
    setIsSavingRecipients(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/email-recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ user_ids: Array.from(selectedUserIds) }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recipients");
      }

      const result = await response.json();
      setSuccess(`Email recipients updated (${result.count} users selected)`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save email recipients. Please try again.");
    } finally {
      setIsSavingRecipients(false);
    }
  };

  const handleSendImmediateNotification = async () => {
    if (selectedUserIds.size === 0) {
      setError("Please select at least one recipient");
      return;
    }

    setIsSendingNotification(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/send-immediate-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ user_ids: Array.from(selectedUserIds) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send notifications");
      }

      if (result.sent > 0) {
        setSuccess(`Notification sent to ${result.sent} user${result.sent === 1 ? '' : 's'}${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      } else {
        setError(`Failed to send notifications. ${result.failed} failed.`);
      }
      
      setShowSendConfirm(false);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notifications. Please try again.");
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleToggleEmail = async (newValue: boolean) => {
    setEmailEnabled(newValue);
    setIsSavingEmailSettings(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/email-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ enabled: newValue, time: emailTime }),
      });

      if (!response.ok) {
        throw new Error("Failed to update email settings");
        setEmailEnabled(!newValue); // Revert on error
      }

      setSuccess(newValue ? "Email notifications enabled" : "Email notifications disabled");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update email settings. Please try again.");
      setEmailEnabled(!newValue); // Revert on error
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleToggleDay = (day: string) => {
    setSendDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setError("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email_send_days: sendDays, email_send_time: sendTime }),
      });
      if (!response.ok) throw new Error("Failed to save schedule");
      setSuccess("Schedule saved");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save schedule. Please try again.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleClearAll = async () => {
    if (confirmText !== "confirm") {
      setError("Please type 'confirm' to proceed");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/clear-all", {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to clear data");
      }

      setSuccess("All data has been cleared successfully");
      setConfirmText("");
      setShowClearAllConfirm(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError("Failed to clear data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const escapeCSV = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDateForCSV = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/export-comprehensive", {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const data = await response.json();
      
      // Use the shared CSV generation function
      const csv = generateCSVContent(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextdoor-complete-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess("CSV exported successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setError("");
    
    try {
      console.log("[PDF Export] Starting export...");
      
      const response = await fetch("/api/admin/export-comprehensive", {
        credentials: 'include',
      });

      console.log("[PDF Export] API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[PDF Export] API error response:", errorText);
        throw new Error("Failed to fetch data: " + response.status);
      }

      const data = await response.json();
      console.log("[PDF Export] Data received:", {
        summary: data.summary,
        userCount: data.users?.length,
        firstUser: data.users?.[0] ? { 
          hasProfile: !!data.users[0].profile,
          profileKeys: data.users[0].profile ? Object.keys(data.users[0].profile) : [],
          messagesCount: data.users[0].messages?.length 
        } : null
      });

      // Fetch image thumbnails and convert to base64
      const thumbnailCache: Record<string, string> = {};
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      // Collect all image attachments
      const imageAttachments: { file_key: string }[] = [];
      for (const user of data.users || []) {
        for (const att of user.attachments || []) {
          if (att.file_key && imageTypes.includes(att.content_type)) {
            imageAttachments.push(att);
          }
        }
      }

      // Fetch images in parallel (limit to 20 concurrent)
      const batchSize = 20;
      for (let i = 0; i < imageAttachments.length; i += batchSize) {
        const batch = imageAttachments.slice(i, i + batchSize);
        await Promise.all(batch.map(async (att) => {
          try {
            const imgResponse = await fetch(`/api/files/${att.file_key}`, {
              credentials: 'include',
            });
            if (imgResponse.ok) {
              const blob = await imgResponse.blob();
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              thumbnailCache[att.file_key] = base64;
            }
          } catch (err) {
            console.log("[PDF Export] Failed to fetch thumbnail:", att.file_key);
          }
        }));
      }

      console.log("[PDF Export] Fetched", Object.keys(thumbnailCache).length, "thumbnails");

      // Build the HTML content

      const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      };

      const formatDateTime = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const escapeHtml = (str: string) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const getUserStatus = (profile: any) => {
        if (profile.is_deleted === true || profile.is_deleted === 1) return { text: 'Deleted', class: 'status-deleted' };
        if (profile.is_active === false || profile.is_active === 0) return { text: 'Deactivated', class: 'status-inactive' };
        return { text: 'Active', class: 'status-active' };
      };

      const generateUserSection = (user: any, thumbnailCache: Record<string, string>) => {
        const p = user.profile || {};
        const status = getUserStatus(p);
        // Generate inline SVG avatar since external URLs may not load in offline HTML
        const name = p.name || 'User';
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const avatarSvg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#4AFF9F" stroke="#205455" stroke-width="4"/><text x="50" y="50" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#205455">${initials}</text></svg>`)}`;
        let html = `
          <div class="user-section">
            <div class="user-header">
              <img 
                class="avatar" 
                src="${avatarSvg}" 
                alt="${escapeHtml(p.name)}"
              />
              <div class="user-title">
                <h3>${escapeHtml(p.name) || 'Unknown'}</h3>
                <span class="room">Room ${escapeHtml(p.room_number) || 'N/A'}</span>
                <span class="user-status ${status.class}">${status.text}</span>
              </div>
            </div>
            <div class="user-meta">
              <p><strong>Email:</strong> ${escapeHtml(p.email) || 'No email'}</p>
              ${p.bio ? `<p><strong>Bio:</strong> ${escapeHtml(p.bio)}</p>` : ''}
              <p><strong>Joined:</strong> ${formatDate(p.joined_date)}</p>
            </div>
        `;

        // Messages section
        if (user.messages && user.messages.length > 0) {
          html += `
            <div class="data-section">
              <h4>💬 Messages (${user.messages.length})</h4>
              <table>
                <thead><tr><th>Message</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.messages.map((m: any) => `
                    <tr>
                      <td>${escapeHtml(m.content?.substring(0, 100) || '')}${m.content?.length > 100 ? '...' : ''}</td>
                      <td>${formatDateTime(m.created_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Attachments section
        if (user.attachments && user.attachments.length > 0) {
          const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          html += `
            <div class="data-section">
              <h4>📎 Attachments (${user.attachments.length})</h4>
              <table>
                <thead><tr><th style="width: 60px;">Preview</th><th>Filename</th><th>Size</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.attachments.map((a: any) => {
                    const isImage = imageTypes.includes(a.content_type);
                    const thumbnail = isImage && a.file_key && thumbnailCache[a.file_key] 
                      ? `<img src="${thumbnailCache[a.file_key]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />`
                      : `<span style="color: #888; font-size: 10px;">${isImage ? 'No preview' : '—'}</span>`;
                    return `
                    <tr>
                      <td style="text-align: center;">${thumbnail}</td>
                      <td>${escapeHtml(a.filename)}</td>
                      <td>${a.file_size ? (a.file_size / 1024).toFixed(1) + ' KB' : 'N/A'}</td>
                      <td>${formatDateTime(a.created_at)}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Events Created section
        if (user.events_created && user.events_created.length > 0) {
          html += `
            <div class="data-section">
              <h4>🎉 Events Created (${user.events_created.length})</h4>
              <table>
                <thead><tr><th>Title</th><th>Location</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.events_created.map((e: any) => `
                    <tr>
                      <td>${escapeHtml(e.title)}</td>
                      <td>${escapeHtml(e.location) || 'N/A'}</td>
                      <td>${formatDateTime(e.event_datetime)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Events Attended section
        if (user.events_attended && user.events_attended.length > 0) {
          html += `
            <div class="data-section">
              <h4>✅ Events Attended (${user.events_attended.length})</h4>
              <table>
                <thead><tr><th>Title</th><th>Location</th><th>Hosted By</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.events_attended.map((e: any) => `
                    <tr>
                      <td>${escapeHtml(e.title)}</td>
                      <td>${escapeHtml(e.location) || 'N/A'}</td>
                      <td>${escapeHtml(e.creator_name)}</td>
                      <td>${formatDateTime(e.event_datetime)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Requests Created section
        if (user.requests_created && user.requests_created.length > 0) {
          html += `
            <div class="data-section">
              <h4>📦 Requests Created (${user.requests_created.length})</h4>
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.requests_created.map((r: any) => `
                    <tr>
                      <td>${escapeHtml(r.title)}</td>
                      <td>${escapeHtml(r.type)}</td>
                      <td>${formatDate(r.ended_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Requests Won section
        if (user.requests_won && user.requests_won.length > 0) {
          html += `
            <div class="data-section">
              <h4>🏆 Requests Won (${user.requests_won.length})</h4>
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Creator</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.requests_won.map((r: any) => `
                    <tr>
                      <td>${escapeHtml(r.title)}</td>
                      <td>${escapeHtml(r.type)}</td>
                      <td>${escapeHtml(r.creator_name)}</td>
                      <td>${formatDate(r.ended_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Requests Helped section
        if (user.requests_helped && user.requests_helped.length > 0) {
          html += `
            <div class="data-section">
              <h4>🤝 Requests Helped (${user.requests_helped.length})</h4>
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Creator</th><th>Date</th></tr></thead>
                <tbody>
                  ${user.requests_helped.map((r: any) => `
                    <tr>
                      <td>${escapeHtml(r.title)}</td>
                      <td>${escapeHtml(r.type)}</td>
                      <td>${escapeHtml(r.creator_name)}</td>
                      <td>${formatDate(r.ended_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        html += '</div>';
        return html;
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Next Door - Complete Data Export</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              background: #f8fafc;
              color: #1e293b;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #22c55e;
            }
            .header h1 {
              font-size: 32px;
              color: #166534;
              margin-bottom: 8px;
            }
            .header p {
              color: #64748b;
              font-size: 14px;
            }
            .stats {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 20px;
              margin-bottom: 40px;
            }
            .stat {
              text-align: center;
              padding: 16px 24px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              min-width: 120px;
            }
            .stat-value {
              font-size: 24px;
              font-weight: bold;
              color: #166534;
            }
            .stat-label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .user-section {
              background: white;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              page-break-inside: avoid;
            }
            .user-header {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 16px;
              padding-bottom: 16px;
              border-bottom: 2px solid #e2e8f0;
            }
            .avatar {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #22c55e;
            }
            .user-title h3 {
              font-size: 20px;
              color: #1e293b;
              margin-bottom: 4px;
            }
            .room {
              font-size: 14px;
              color: #22c55e;
              font-weight: 500;
              margin-right: 12px;
            }
            .user-status {
              font-size: 11px;
              padding: 4px 10px;
              border-radius: 20px;
              display: inline-block;
            }
            .status-active { background: #dcfce7; color: #166534; }
            .status-inactive { background: #fef3c7; color: #92400e; }
            .status-deleted { background: #fee2e2; color: #991b1b; }
            .user-meta {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .user-meta p { margin-bottom: 4px; }
            .user-meta strong { color: #475569; }
            .data-section {
              margin-top: 20px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
            }
            .data-section h4 {
              font-size: 14px;
              color: #166534;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              padding: 8px 12px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
            }
            td {
              color: #64748b;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            @media print {
              body { padding: 20px; background: white; }
              .user-section { box-shadow: none; border: 1px solid #e2e8f0; page-break-inside: avoid; }
              .stat { box-shadow: none; border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏠 Next Door</h1>
            <p>Complete Data Export</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${data.summary.total_users}</div>
              <div class="stat-label">Users</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.active_users}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.total_messages}</div>
              <div class="stat-label">Messages</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.total_attachments}</div>
              <div class="stat-label">Attachments</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.total_events}</div>
              <div class="stat-label">Events</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.total_requests}</div>
              <div class="stat-label">Requests</div>
            </div>
          </div>
          
          ${data.users.map((user: any) => generateUserSection(user, thumbnailCache)).join('')}
          
          <div class="footer">
            <p>Exported on ${formatDate(data.exported_at)} • Next Door Neighborhood Chat</p>
          </div>
          
        </body>
        </html>
      `;
      
      console.log("[PDF Export] HTML content generated, length:", htmlContent.length);
      
      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      console.log("[PDF Export] Blob created, size:", blob.size);
      
      const url = window.URL.createObjectURL(blob);
      console.log("[PDF Export] Blob URL created:", url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextdoor-export-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("[PDF Export] Download triggered successfully");
      setSuccess("HTML exported! Open the file and use Print (Ctrl+P) to save as PDF.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      console.error("[PDF Export] Error:", err);
      console.error("[PDF Export] Error message:", err?.message);
      console.error("[PDF Export] Error stack:", err?.stack);
      setError("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Shared function to generate CSV content for both CSV and ZIP exports
  const generateCSVContent = (data: any): string => {
    const users = data.users;
    const csvRows: string[] = [];

    // Summary Section
    csvRows.push('=== EXPORT SUMMARY ===');
    csvRows.push(`Exported On,${formatDateForCSV(data.exportedAt || data.exported_at)}`);
    csvRows.push(`Total Users,${data.summary.total_users}`);
    csvRows.push(`Total Messages,${data.summary.total_messages}`);
    csvRows.push(`Total Attachments,${data.summary.total_attachments}`);
    csvRows.push(`Total Events,${data.summary.total_events}`);
    csvRows.push(`Total Requests,${data.summary.total_requests}`);
    csvRows.push('');

    // Process each user (sorted A-Z)
    for (const user of users) {
      const p = user.profile;
      
      // User Profile Section
      csvRows.push(`=== USER: ${escapeCSV(p.name)} (Room ${escapeCSV(p.room_number)}) ===`);
      csvRows.push('');
      csvRows.push('--- PROFILE ---');
      csvRows.push('Name,Room,Email,Bio,Status,Admin,Joined Date');
      csvRows.push([
        escapeCSV(p.name),
        escapeCSV(p.room_number),
        escapeCSV(p.email),
        escapeCSV(p.bio),
        p.is_deleted ? 'Deleted' : (p.is_active ? 'Active' : 'Deactivated'),
        p.is_admin ? 'Yes' : 'No',
        formatDateForCSV(p.joined_date)
      ].join(','));
      csvRows.push('');

      // Messages Section
      if (user.messages.length > 0) {
        csvRows.push('--- MESSAGES (Main Chat) ---');
        csvRows.push('Date,Content,Edited');
        for (const msg of user.messages) {
          csvRows.push([
            formatDateForCSV(msg.created_at),
            escapeCSV(msg.content),
            msg.is_edited ? 'Yes' : 'No'
          ].join(','));
        }
        csvRows.push('');
      }

      // Attachments Section
      if (user.attachments.length > 0) {
        csvRows.push('--- ATTACHMENTS ---');
        csvRows.push('Date,Filename,Type,Size (KB)');
        for (const att of user.attachments) {
          csvRows.push([
            formatDateForCSV(att.created_at),
            escapeCSV(att.filename || att.file_name),
            escapeCSV(att.content_type),
            Math.round((att.file_size || 0) / 1024)
          ].join(','));
        }
        csvRows.push('');
      }

      // Events Created Section
      if (user.events_created.length > 0) {
        csvRows.push('--- EVENTS CREATED ---');
        csvRows.push('Event Name,Description,Location,Start Date,End Date,Attendees,Status');
        for (const evt of user.events_created) {
          csvRows.push([
            escapeCSV(evt.name),
            escapeCSV(evt.description),
            escapeCSV(evt.location),
            formatDateForCSV(evt.start_datetime),
            formatDateForCSV(evt.end_datetime),
            evt.total_attendees,
            evt.is_deleted ? 'Deleted' : 'Ended'
          ].join(','));
        }
        csvRows.push('');
      }

      // Events Attended Section
      if (user.events_attended.length > 0) {
        csvRows.push('--- EVENTS ATTENDED ---');
        csvRows.push('Event Name,Description,Location,Start Date,End Date,Created By');
        for (const evt of user.events_attended) {
          csvRows.push([
            escapeCSV(evt.name),
            escapeCSV(evt.description),
            escapeCSV(evt.location),
            formatDateForCSV(evt.start_datetime),
            formatDateForCSV(evt.end_datetime),
            escapeCSV(evt.creator_name)
          ].join(','));
        }
        csvRows.push('');
      }

      // Requests Created Section
      if (user.requests_created.length > 0) {
        csvRows.push('--- REQUESTS CREATED ---');
        csvRows.push('Title,Description,Type,Transaction,Free,Price,Interested,Winner,Status');
        for (const req of user.requests_created) {
          csvRows.push([
            escapeCSV(req.title),
            escapeCSV(req.description),
            escapeCSV(req.type),
            escapeCSV(req.transaction_type),
            req.is_free ? 'Yes' : 'No',
            req.price || '',
            req.total_interested,
            escapeCSV(req.winner_name),
            req.is_deleted ? 'Deleted' : 'Fulfilled'
          ].join(','));
        }
        csvRows.push('');
      }

      // Requests Won Section
      if (user.requests_won.length > 0) {
        csvRows.push('--- REQUESTS WON ---');
        csvRows.push('Title,Type,Transaction,Created By,Date');
        for (const req of user.requests_won) {
          csvRows.push([
            escapeCSV(req.title),
            escapeCSV(req.type),
            escapeCSV(req.transaction_type),
            escapeCSV(req.creator_name),
            formatDateForCSV(req.ended_at)
          ].join(','));
        }
        csvRows.push('');
      }

      // Requests Helped Section
      if (user.requests_helped.length > 0) {
        csvRows.push('--- REQUESTS HELPED ---');
        csvRows.push('Title,Type,Created By,Date');
        for (const req of user.requests_helped) {
          csvRows.push([
            escapeCSV(req.title),
            escapeCSV(req.type),
            escapeCSV(req.creator_name),
            formatDateForCSV(req.ended_at)
          ].join(','));
        }
        csvRows.push('');
      }

      csvRows.push(''); // Extra spacing between users
    }

    return csvRows.join('\n');
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/export-comprehensive", {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const zip = new JSZip();
      
      // Use the same CSV generation as standalone CSV export
      const csvContent = generateCSVContent(data);

      // Add CSV to ZIP
      zip.file("export-data.csv", csvContent);

      // Create attachments folder and download each attachment
      const attachmentsFolder = zip.folder("attachments");
      let downloadedCount = 0;
      let failedCount = 0;

      for (const user of data.users) {
        if (user.attachments && user.attachments.length > 0) {
          // Create user folder inside attachments
          const sanitizedName = (user.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
          const userFolder = attachmentsFolder?.folder(`${sanitizedName}_${user.room_number || 'no-room'}`);
          
          for (const attachment of user.attachments) {
            try {
              // Extract file key from URL or use stored key
              const fileKey = attachment.file_key || attachment.file_url?.split('/').pop();
              if (!fileKey) continue;

              const fileResponse = await fetch(`/api/files/${fileKey}`, {
                credentials: 'include',
              });

              if (fileResponse.ok) {
                const blob = await fileResponse.blob();
                userFolder?.file(attachment.file_name || fileKey, blob);
                downloadedCount++;
              } else {
                failedCount++;
              }
            } catch {
              failedCount++;
            }
          }
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nextdoor-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      let successMsg = `ZIP exported with CSV and ${downloadedCount} attachment(s)`;
      if (failedCount > 0) {
        successMsg += ` (${failedCount} files couldn't be downloaded)`;
      }
      setSuccess(successMsg);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Failed to export ZIP. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearMessages = async () => {
    if (confirmText !== "confirm") {
      setError("Please type 'confirm' to proceed");
      return;
    }

    const months = parseInt(monthsOld);
    if (isNaN(months) || months < 1) {
      setError("Please enter a valid number of months");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/clear-messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ months_old: months }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete messages");
      }

      const result = await response.json();
      setSuccess(`Successfully deleted ${result.deleted_count} message(s)`);
      setConfirmText("");
      setShowClearMessagesConfirm(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError("Failed to delete messages. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      <div className="sticky top-0 bg-white dark:bg-dark-ocean px-xl py-m flex items-center justify-between z-10 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Admin Settings</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-xl py-xl space-y-xl">
          {success && (
            <div className="bg-success/10 dark:bg-success/20 border border-success/30 rounded-button-rect p-m animate-scale-in">
              <p className="text-success text-sm font-outfit">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-error/10 dark:bg-error/20 border border-error/30 rounded-button-rect p-m animate-scale-in">
              <p className="text-error text-sm font-outfit">{error}</p>
            </div>
          )}

          {/* Email Notification Settings */}
          <div>
            <h3 className="text-lg font-semibold text-primary-pine dark:text-primary-mint mb-s font-nura flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-m font-outfit">
              Send daily digest emails to all active users with community updates and unread messages.
            </p>

            {/* Resend Dashboard Link */}
            <a
              href="https://resend.com/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-light-surface dark:bg-dark-surface rounded-button-rect hover:bg-primary-mint/10 dark:hover:bg-primary-mint/10 transition-all group mb-4"
            >
              <div className="p-2 rounded-full bg-primary-mint/20 text-primary-pine dark:text-primary-mint">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-white font-outfit">Resend Dashboard</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                  Manage email sending, view analytics & logs
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-primary-mint transition-colors" />
            </a>

            {isLoadingEmailSettings ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-primary-mint rounded-full animate-spin"></div>
                <span className="text-sm font-outfit">Loading settings...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toggle Switch */}
                <div className="flex items-center justify-between p-4 bg-light-surface dark:bg-dark-surface rounded-button-rect">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${emailEnabled ? 'bg-success/20 text-success' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white font-outfit">Daily Email Digest</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                        {emailEnabled ? 'Emails will be sent daily' : 'Email notifications are off'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleEmail(!emailEnabled)}
                    disabled={isSavingEmailSettings}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                      emailEnabled 
                        ? 'bg-success' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    } ${isSavingEmailSettings ? 'opacity-50' : ''}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      emailEnabled ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Schedule Configuration */}
                <div className={`p-4 bg-light-surface dark:bg-dark-surface rounded-button-rect space-y-4 ${!emailEnabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary-pine dark:text-primary-mint" />
                    <p className="font-medium text-slate-800 dark:text-white font-outfit text-sm">Send Schedule</p>
                  </div>

                  {/* Summary */}
                  {sendDays.length > 0 && (
                    <p className="text-xs text-primary-pine dark:text-primary-mint font-outfit">
                      Currently sending on: {sendDays.map(d => DAY_LABELS[d] || d).join(', ')} at {sendTime} GMT/BST
                    </p>
                  )}

                  {/* Day pills */}
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mb-2">Send days</p>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => handleToggleDay(day)}
                          disabled={!emailEnabled}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium font-outfit transition-all ${
                            sendDays.includes(day)
                              ? 'bg-primary-mint text-primary-pine'
                              : 'bg-white dark:bg-dark-elevated text-slate-500 dark:text-slate-400 hover:bg-primary-mint/20'
                          } disabled:cursor-not-allowed`}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time input */}
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 font-outfit mb-1">
                      Send time (GMT/BST)
                    </label>
                    <input
                      type="time"
                      value={sendTime}
                      onChange={e => setSendTime(e.target.value)}
                      disabled={!emailEnabled}
                      className="px-3 py-2 rounded-button-rect bg-white dark:bg-dark-elevated border-2 border-transparent focus:border-primary-mint outline-none transition-all font-outfit text-slate-800 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-outfit mt-1">
                      UK timezone (GMT/BST) — auto-adjusts for daylight saving
                    </p>
                  </div>

                  <button
                    onClick={handleSaveSchedule}
                    disabled={!emailEnabled || isSavingSchedule || sendDays.length === 0}
                    className="w-full px-m py-2 bg-gradient-primary hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit text-sm"
                  >
                    {isSavingSchedule ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit italic">
                  Note: Emails require a valid RESEND_API_KEY and cron-job.org configured to call /api/cron every 15 minutes.
                </p>

                {/* User Selection */}
                <div className={`p-4 bg-light-surface dark:bg-dark-surface rounded-button-rect transition-opacity ${!emailEnabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-primary-mint/20 text-primary-pine dark:text-primary-mint">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-white font-outfit">Email Recipients</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                        {selectedUserIds.size === 0 
                          ? "All active users will receive emails" 
                          : `${selectedUserIds.size} user${selectedUserIds.size === 1 ? '' : 's'} selected`}
                      </p>
                    </div>
                  </div>

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-primary-mint rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {/* Select All */}
                      <button
                        onClick={handleSelectAll}
                        disabled={!emailEnabled}
                        className="w-full flex items-center gap-3 p-3 mb-2 bg-white dark:bg-dark-elevated rounded-button-rect hover:bg-primary-mint/10 dark:hover:bg-primary-mint/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selectedUserIds.size === allUsers.length && allUsers.length > 0
                            ? 'bg-primary-mint border-primary-mint' 
                            : selectedUserIds.size > 0 
                              ? 'bg-primary-mint/50 border-primary-mint' 
                              : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {(selectedUserIds.size === allUsers.length && allUsers.length > 0) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                          {(selectedUserIds.size > 0 && selectedUserIds.size < allUsers.length) && (
                            <div className="w-2 h-0.5 bg-white rounded"></div>
                          )}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 font-outfit">
                          Select All ({allUsers.length} users)
                        </span>
                      </button>

                      {/* User List */}
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                        {allUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleToggleUser(user.id)}
                            disabled={!emailEnabled}
                            className="w-full flex items-center gap-3 p-2 bg-white dark:bg-dark-elevated rounded-button-rect hover:bg-primary-mint/10 dark:hover:bg-primary-mint/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              selectedUserIds.has(user.id) 
                                ? 'bg-primary-mint border-primary-mint' 
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {selectedUserIds.has(user.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <img
                              src={getUserAvatar(user.email, user.avatar_url)}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium text-slate-800 dark:text-white text-sm truncate font-outfit">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-outfit">
                                Room {user.room_number} • {user.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSaveRecipients}
                          disabled={!emailEnabled || isSavingRecipients}
                          className="flex-1 px-m py-2 bg-gradient-primary hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit"
                        >
                          {isSavingRecipients ? "Saving..." : "Save Recipients"}
                        </button>
                        <button
                          onClick={() => setShowSendConfirm(true)}
                          disabled={!emailEnabled || selectedUserIds.size === 0 || isSendingNotification}
                          className="flex-1 px-m py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          {isSendingNotification ? "Sending..." : "Send Now"}
                        </button>
                      </div>

                      {/* Send Confirmation Dialog */}
                      {showSendConfirm && (
                        <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-button-rect">
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium font-outfit mb-3">
                            📧 Send notification email to {selectedUserIds.size} selected user{selectedUserIds.size === 1 ? '' : 's'}?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSendImmediateNotification}
                              disabled={isSendingNotification}
                              className="flex-1 px-m py-2 bg-amber-500 hover:bg-amber-600 hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all font-outfit"
                            >
                              {isSendingNotification ? "Sending..." : "Confirm Send"}
                            </button>
                            <button
                              onClick={() => setShowSendConfirm(false)}
                              disabled={isSendingNotification}
                              className="flex-1 px-m py-2 bg-slate-200 dark:bg-dark-elevated hover:bg-slate-300 dark:hover:bg-slate-700 hover:scale-105 text-slate-700 dark:text-slate-300 rounded-button-rect font-medium transition-all font-outfit"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-2 text-center">
                        {selectedUserIds.size === 0 
                          ? "No users selected = emails sent to all active users (for daily digest)" 
                          : "Only selected users will receive email notifications"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export User Data */}
          <div className="pt-xl border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-primary-pine dark:text-primary-mint mb-s font-nura flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export User Data
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-m font-outfit">
              Export comprehensive user data including profiles, messages, attachments, event history, and request history — organized by user (A-Z). Choose CSV, PDF, or ZIP (includes all files).
            </p>
            
            <div className="flex flex-col gap-s">
              <div className="flex gap-s">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex-1 px-m py-3 bg-gradient-primary hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex-1 px-m py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export PDF"}
                </button>
              </div>
              <button
                onClick={handleExportZIP}
                disabled={isExporting}
                className="w-full px-m py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit flex items-center justify-center gap-2"
              >
                <Archive className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Export ZIP (CSV + All Files)"}
              </button>
            </div>
          </div>

          {/* Delete Old Messages */}
          <div className="pt-xl border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-warning mb-s font-nura">
              Delete Old Messages
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-m font-outfit">
              Delete all messages older than a specified number of months. This includes main chat, event chats, request chats, their attachments, reactions, and history records.
            </p>
            
            {!showClearMessagesConfirm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-s font-outfit">
                    Delete messages older than
                  </label>
                  <input
                    type="text"
                    value={monthsOld}
                    onChange={(e) => setMonthsOld(e.target.value)}
                    className="w-full px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border-2 border-transparent focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-slate-800 dark:text-white"
                    placeholder="6 Months"
                  />
                </div>
                <button
                  onClick={() => {
                    setConfirmText("");
                    setError("");
                    setShowClearMessagesConfirm(true);
                  }}
                  className="w-full px-m py-3 bg-warning hover:scale-105 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit"
                >
                  Delete Old Messages
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 rounded-button-rect p-3">
                  <p className="text-sm text-warning font-medium font-outfit">
                    ⚠️ This will permanently delete all messages older than {monthsOld} month(s)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-s font-outfit">
                    Type <span className="font-mono bg-slate-100 dark:bg-dark-elevated px-2 py-0.5 rounded">confirm</span> to proceed
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => {
                      setConfirmText(e.target.value);
                      setError("");
                    }}
                    className="w-full px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border-2 border-transparent focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-slate-800 dark:text-white"
                    placeholder="Type 'confirm'"
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex gap-s">
                  <button
                    onClick={() => {
                      setShowClearMessagesConfirm(false);
                      setConfirmText("");
                      setError("");
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-m py-2 bg-slate-200 dark:bg-dark-elevated hover:bg-slate-300 dark:hover:bg-slate-700 hover:scale-105 text-slate-700 dark:text-slate-300 rounded-button-rect font-medium transition-all font-outfit"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearMessages}
                    disabled={isProcessing || confirmText !== "confirm"}
                    className="flex-1 px-m py-2 bg-warning hover:scale-105 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:scale-100 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit"
                  >
                    {isProcessing ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear All Data */}
          <div className="pt-xl border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-error mb-s font-nura">
              Clear All Data
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-m font-outfit">
              Permanently delete all messages, events, requests, their chats, attachments, transactions, and history. User profiles and accounts remain active.
            </p>
            
            {!showClearAllConfirm ? (
              <button
                onClick={() => {
                  setConfirmText("");
                  setError("");
                  setShowClearAllConfirm(true);
                }}
                className="w-full px-m py-3 bg-error hover:scale-105 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit"
              >
                Clear All Data
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-error/10 dark:bg-error/20 border border-error/30 rounded-button-rect p-3">
                  <p className="text-sm text-error font-medium font-outfit">
                    ⚠️ This action cannot be undone. All data will be permanently deleted.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-s font-outfit">
                    Type <span className="font-mono bg-slate-100 dark:bg-dark-elevated px-2 py-0.5 rounded">confirm</span> to proceed
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => {
                      setConfirmText(e.target.value);
                      setError("");
                    }}
                    className="w-full px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border-2 border-transparent focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-slate-800 dark:text-white"
                    placeholder="Type 'confirm'"
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex gap-s">
                  <button
                    onClick={() => {
                      setShowClearAllConfirm(false);
                      setConfirmText("");
                      setError("");
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-m py-2 bg-slate-200 dark:bg-dark-elevated hover:bg-slate-300 dark:hover:bg-slate-700 hover:scale-105 text-slate-700 dark:text-slate-300 rounded-button-rect font-medium transition-all font-outfit"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing || confirmText !== "confirm"}
                    className="flex-1 px-m py-2 bg-error hover:scale-105 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:scale-100 text-white rounded-button-rect font-medium transition-all shadow-soft font-outfit"
                  >
                    {isProcessing ? "Clearing..." : "Confirm Clear All"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
