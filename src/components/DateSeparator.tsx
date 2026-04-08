interface DateSeparatorProps {
  date: string;
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  return (
    <div className="flex justify-center my-m">
      <div className="bg-slate-200/80 dark:bg-dark-surface/90 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-button-rect text-xs font-medium shadow-soft dark:shadow-soft-dark backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 font-outfit">
        {formatDate(date)}
      </div>
    </div>
  );
}
