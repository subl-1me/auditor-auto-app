import { RateLog } from "../types/LogCategorization";
import dotenv from "dotenv";
dotenv.config();

export const getDateInfo = (rateLog: RateLog) => {
  const sanitPattern = /<td>|<\/td>/g;
  //   const [tYear, tMonth, tDay] = TODAY_DATE.split("/").map(Number);

  const logDateSanit = rateLog.dateString.replace(sanitPattern, "");
  const [logDateString, logHour] = logDateSanit.split(" ");
  const [logMonth, logDay, logYear] = logDateString.split("/").map(Number);

  console.log(logDateString);

  console.log(logHour);
  // get time difference
  let [hourNum, minNum, secNum] = logHour.split(":").map(Number);
  if (logDateSanit.includes("PM") && hourNum < 12) {
    hourNum += 12;
  } else if (logDateSanit.includes("AM") && hourNum === 12) {
    hourNum = 0;
  }

  console.log(hourNum, minNum, secNum);
  const logDate = new Date(
    logYear,
    logMonth - 1,
    logDay,
    hourNum,
    minNum,
    secNum
  );

  const today = new Date();
  const diffMs = today.getTime() - logDate.getTime();
  const diffSecs = diffMs / 1000;
  const diffMins = Math.floor((diffSecs % 3600) / 60);
  const diffHours = diffMs / 3600000;

  const isToday = (date: Date) => {
    console.log(today);
    console.log(logDate);
    return (
      date.getDay() === today.getDay() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return {
    isToday: isToday(logDate),
    diffHours,
    diffMins,
    diffMs,
    diffSecs,
    formattedDate: logDate,
  };
};
