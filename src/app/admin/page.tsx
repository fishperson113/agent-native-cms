import type { Metadata } from "next";

import { AdminEntry } from "./ui/admin-entry";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Operator console",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className={styles.page}>
      <AdminEntry />
    </main>
  );
}
