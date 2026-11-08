import {
  Backpack, BatteryCharging, Boxes, CalendarCheck, History, House, LayoutDashboard, ListChecks, MapPin, MessagesSquare,
  Package, Settings, ShoppingCart, Siren, UserRound, Users, Building2, LifeBuoy, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  { label: "", items: [{ href: "/app/sos", label: "Emergência (SOS)", icon: LifeBuoy }, { href: "/app", label: "Painel", icon: LayoutDashboard }] },
  {
    label: "Preparação",
    items: [
      { href: "/app/home-kit", label: "HOME KIT", icon: House },
      { href: "/app/go-bags", label: "GO BAGS", icon: Backpack },
      { href: "/app/inventory", label: "Inventário", icon: Boxes },
      { href: "/app/shopping", label: "Lista de compras", icon: ShoppingCart },
      { href: "/app/products", label: "Produtos", icon: Package },
      { href: "/app/energy", label: "Energia", icon: BatteryCharging },
    ],
  },
  {
    label: "Plano familiar",
    items: [
      { href: "/app/scenarios", label: "Cenários", icon: Siren },
      { href: "/app/meeting-points", label: "Pontos de encontro", icon: MapPin },
      { href: "/app/communication", label: "Comunicação", icon: MessagesSquare },
      { href: "/app/tasks", label: "Tarefas", icon: ListChecks },
      { href: "/app/reviews", label: "Revisões", icon: CalendarCheck },
    ],
  },
  {
    label: "Família",
    items: [
      { href: "/app/family", label: "A minha família", icon: Users },
      { href: "/app/members", label: "Membros", icon: UserRound },
      { href: "/app/household", label: "Habitação", icon: Building2 },
      { href: "/app/activity", label: "Atividade", icon: History },
      { href: "/app/settings", label: "Definições", icon: Settings },
    ],
  },
];

/** Mobile bottom bar: two items, the central SOS button, one item, then "Mais". */
export const MOBILE_PRIMARY: NavItem[] = [
  { href: "/app", label: "Painel", icon: LayoutDashboard },
  { href: "/app/home-kit", label: "Kits", icon: House },
  { href: "/app/shopping", label: "Compras", icon: ShoppingCart },
];

/** Pages made available offline by "Disponibilizar offline". */
export const OFFLINE_PAGES = [
  "/app/sos", "/app", "/app/home-kit", "/app/go-bags", "/app/meeting-points", "/app/communication", "/app/scenarios",
  "/app/inventory", "/app/members", "/app/print/plan", "/app/print/cards",
];
