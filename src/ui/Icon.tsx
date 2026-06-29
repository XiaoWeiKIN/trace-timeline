import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Circle,
  Clock,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Link as LinkIcon,
  Search,
  Share2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { MouseEventHandler } from 'react';

// grafana 图标名 → lucide 组件映射。
const ICON_MAP: Record<string, LucideIcon> = {
  'angle-down': ChevronDown,
  'angle-right': ChevronRight,
  'angle-up': ChevronUp,
  'angle-double-down': ChevronsDown,
  'angle-double-up': ChevronsUp,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-right': ArrowRight,
  'exclamation-circle': AlertCircle,
  'info-circle': Info,
  'external-link-alt': ExternalLink,
  link: LinkIcon,
  'share-alt': Share2,
  copy: Copy,
  cloud: Cloud,
  globe: Globe,
  times: X,
  'clock-nine': Clock,
  search: Search,
};

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

export function Icon({ name, size = 16, className, title, onClick }: IconProps) {
  const Cmp = ICON_MAP[name];
  if (!Cmp && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(`[trace-timeline] unknown icon name: ${name}`);
  }
  const Resolved = Cmp ?? Circle;
  return <Resolved size={size} className={className} aria-label={title} onClick={onClick} />;
}
