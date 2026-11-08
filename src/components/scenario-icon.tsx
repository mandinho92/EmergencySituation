import { Activity, Baby, CloudLightning, DoorOpen, Droplets, Flame, HeartPulse, House, PawPrint, PhoneOff, Siren, Snowflake, ThermometerSun, TreePine, Users, Waves, WifiOff, Wind, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Activity, Baby, CloudLightning, DoorOpen, Droplets, Flame, HeartPulse, House, PawPrint, PhoneOff, Snowflake, ThermometerSun, TreePine, Users, Waves, WifiOff, Wind, Zap };

export function ScenarioIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Siren;
  return <Icon className={className} aria-hidden />;
}
