interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

export default function SettingsSectionHeader({ title, description }: SettingsSectionHeaderProps) {
  return (
    <header className="mb-4 border-b border-white/10 pb-3 sm:mb-5 sm:pb-4">
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-gray-400 sm:mt-1.5 sm:text-sm">
          {description}
        </p>
      )}
    </header>
  );
}
