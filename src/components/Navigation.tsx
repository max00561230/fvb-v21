import { FvbArchiveNavigation } from "./FvbMuseumComponents";

export function Navigation({ variant = "default" }: { variant?: "default" | "overlay" }) {
  return <FvbArchiveNavigation variant={variant} />;
}
