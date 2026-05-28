import { Sidebar } from "@/components/sidebar/Sidebar";
import { VoicePip } from "@/components/VoicePip";
import { CommandPaletteWrapper } from "@/components/CommandPaletteWrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <VoicePip />
      <CommandPaletteWrapper />
    </div>
  );
}
