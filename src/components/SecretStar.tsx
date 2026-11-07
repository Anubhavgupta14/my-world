import { SECRETS, SECRET_COUNT } from "@/lib/content";
import { updateProgress } from "@/lib/progress";
import { sound } from "@/lib/sound";
import { SparkleIcon } from "./icons";
import { centerOf, useUniverse } from "./universe-context";

/** A tiny, optional hidden star. Tapping it reveals a little personal note. */
export function SecretStar({ id, className = "" }: { id: keyof typeof SECRETS & string; className?: string }) {
  const { progress, toast, celebrate } = useUniverse();
  const found = progress.secrets.includes(id);

  return (
    <button
      type="button"
      className={`secret-star ${found ? "found" : ""} ${className}`}
      aria-label={found ? "A secret star you found — read its note again" : "A tiny hidden star"}
      onClick={(event) => {
        const total = found ? progress.secrets.length : progress.secrets.length + 1;
        if (!found) {
          updateProgress((p) => ({ ...p, secrets: [...p.secrets, id] }));
          celebrate({ ...centerOf(event.currentTarget), count: 14 });
        }
        sound.play("star");
        toast(SECRETS[id], {
          icon: "🌟",
          title: `Secret star ${total} of ${SECRET_COUNT}`,
          duration: 7000,
        });
      }}
    >
      <SparkleIcon width={18} height={18} />
    </button>
  );
}
