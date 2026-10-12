import { potColorClasses, potIcon } from "@/lib/pot-options";
import { cx } from "@/utils/cx";

export function PotTile({ icon, color, className }: { icon: string; color: string; className?: string }) {
  const Icon = potIcon(icon);
  return (
    <span
      className={cx(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        potColorClasses(color).tile,
        className,
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}
