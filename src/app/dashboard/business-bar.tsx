import { ShareLink } from "./share-link";

export function BusinessBar({
  role,
  userEmail,
  slug,
}: {
  role: "OWNER" | "STAFF";
  userEmail: string;
  slug: string;
}) {
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            role === "OWNER" ? "bg-neutral-900 text-white" : "border border-neutral-300"
          }`}
          title={role === "OWNER" ? "Eres el dueño del negocio" : "Eres personal del negocio"}
        >
          {role === "OWNER" ? "Propietario" : "Personal"}
        </span>
        <span title="Sesión actual">{userEmail}</span>
      </p>
      <ShareLink slug={slug} />
    </div>
  );
}
