// Global Lucide icon registration
// Icons are registered with "Icon" prefix, e.g., <IconPlus />, <IconLoader />
import {
  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Menu,
  MoreHorizontal,
  MoreVertical,
  X,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash,
  Trash2,
  Copy,
  Check,
  CheckSquare,
  Square,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Share,

  // Status & Feedback
  Loader,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,

  // Files & Documents
  File,
  FileText,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSync,
  Image,
  Paperclip,

  // Communication
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Video,

  // Users & People
  User,
  UserCircle,
  UserPlus,
  UserMinus,
  UserCheck,
  Users,
  Contact,

  // Business & Commerce
  Briefcase,
  Building,
  CreditCard,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Receipt,

  // Layout & Organization
  Grid,
  List,
  Layers,
  Layout,
  LayoutGrid,
  Map,
  GitBranch,

  // Settings & Tools
  Settings,
  Wrench,
  Cog,
  Sliders,

  // Security & Auth
  Lock,
  Unlock,
  Key,
  KeyRound,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,

  // Calendar & Time
  Calendar,
  CalendarDays,
  CalendarPlus,

  // Media
  Play,
  Pause,
  Volume2,
  VolumeX,

  // Misc
  Home,
  Star,
  Heart,
  Bookmark,
  Tag,
  Hash,
  Link,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,

  // Workflow & Process
  CircleDot,
  Repeat,
  GripVertical,
  GripHorizontal,

  // Signatures & Legal
  PenTool,
  Pen,
  FilePenLine,
  Signature,
  ClipboardList,
  ClipboardCheck,

  // Forms
  FormInput,
  ToggleLeft,
  ToggleRight,

  // Social
  Globe,
  Linkedin,
  Twitter,
  Facebook,
  Github,

  // Arrows & Direction
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight,

  // Log/History
  History,
  Archive,

  // Type alias for component
  type LucideIcon
} from 'lucide-vue-next'

export default defineNuxtPlugin((nuxtApp) => {
  // Register all icons with "Icon" prefix
  const icons: Record<string, LucideIcon> = {
    // Navigation & UI
    IconArrowLeft: ArrowLeft,
    IconArrowRight: ArrowRight,
    IconArrowDown: ArrowDown,
    IconArrowUp: ArrowUp,
    IconChevronLeft: ChevronLeft,
    IconChevronRight: ChevronRight,
    IconChevronDown: ChevronDown,
    IconChevronUp: ChevronUp,
    IconX: X,
    IconMenu: Menu,
    IconMoreHorizontal: MoreHorizontal,
    IconMoreVertical: MoreVertical,
    IconExternalLink: ExternalLink,

    // Actions
    IconPlus: Plus,
    IconMinus: Minus,
    IconEdit: Edit,
    IconTrash: Trash,
    IconTrash2: Trash2,
    IconCopy: Copy,
    IconCheck: Check,
    IconCheckSquare: CheckSquare,
    IconSquare: Square,
    IconSearch: Search,
    IconFilter: Filter,
    IconDownload: Download,
    IconUpload: Upload,
    IconRefreshCw: RefreshCw,
    IconRotateCcw: RotateCcw,
    IconSave: Save,
    IconSend: Send,
    IconShare: Share,

    // Status & Feedback
    IconLoader: Loader,
    IconAlertTriangle: AlertTriangle,
    IconAlertCircle: AlertCircle,
    IconInfo: Info,
    IconHelpCircle: HelpCircle,
    IconCheckCircle: CheckCircle,
    IconXCircle: XCircle,
    IconClock: Clock,

    // Files & Documents
    IconFile: File,
    IconFileText: FileText,
    IconFilePlus: FilePlus,
    IconFolder: Folder,
    IconFolderOpen: FolderOpen,
    IconFolderPlus: FolderPlus,
    IconFolderSync: FolderSync,
    IconImage: Image,
    IconPaperclip: Paperclip,

    // Communication
    IconMail: Mail,
    IconMessageSquare: MessageSquare,
    IconMessageCircle: MessageCircle,
    IconPhone: Phone,
    IconVideo: Video,

    // Users & People
    IconUser: User,
    IconUserCircle: UserCircle,
    IconUserPlus: UserPlus,
    IconUserMinus: UserMinus,
    IconUserCheck: UserCheck,
    IconUsers: Users,
    IconContact: Contact,

    // Business & Commerce
    IconBriefcase: Briefcase,
    IconBuilding: Building,
    IconCreditCard: CreditCard,
    IconDollarSign: DollarSign,
    IconShoppingBag: ShoppingBag,
    IconShoppingCart: ShoppingCart,
    IconReceipt: Receipt,

    // Layout & Organization
    IconGrid: Grid,
    IconList: List,
    IconLayers: Layers,
    IconLayout: Layout,
    IconLayoutGrid: LayoutGrid,
    IconMap: Map,
    IconGitBranch: GitBranch,

    // Settings & Tools
    IconSettings: Settings,
    IconWrench: Wrench,
    IconCog: Cog,
    IconSliders: Sliders,

    // Security & Auth
    IconLock: Lock,
    IconUnlock: Unlock,
    IconKey: Key,
    IconKeyRound: KeyRound,
    IconShield: Shield,
    IconShieldCheck: ShieldCheck,
    IconEye: Eye,
    IconEyeOff: EyeOff,

    // Calendar & Time
    IconCalendar: Calendar,
    IconCalendarDays: CalendarDays,
    IconCalendarPlus: CalendarPlus,

    // Media
    IconPlay: Play,
    IconPause: Pause,
    IconVolume2: Volume2,
    IconVolumeX: VolumeX,

    // Misc
    IconHome: Home,
    IconStar: Star,
    IconHeart: Heart,
    IconBookmark: Bookmark,
    IconTag: Tag,
    IconHash: Hash,
    IconLink: Link,
    IconZap: Zap,
    IconActivity: Activity,
    IconTrendingUp: TrendingUp,
    IconTrendingDown: TrendingDown,
    IconBarChart: BarChart,
    IconPieChart: PieChart,

    // Workflow & Process
    IconCircleDot: CircleDot,
    IconRepeat: Repeat,
    IconGripVertical: GripVertical,
    IconGripHorizontal: GripHorizontal,

    // Signatures & Legal
    IconPenTool: PenTool,
    IconPen: Pen,
    IconFilePenLine: FilePenLine,
    IconSignature: Signature,
    IconClipboardList: ClipboardList,
    IconClipboardCheck: ClipboardCheck,

    // Forms
    IconFormInput: FormInput,
    IconToggleLeft: ToggleLeft,
    IconToggleRight: ToggleRight,

    // Social
    IconGlobe: Globe,
    IconLinkedin: Linkedin,
    IconTwitter: Twitter,
    IconFacebook: Facebook,
    IconGithub: Github,

    // Arrows & Direction
    IconMoveUp: MoveUp,
    IconMoveDown: MoveDown,
    IconMoveLeft: MoveLeft,
    IconMoveRight: MoveRight,

    // Log/History
    IconHistory: History,
    IconArchive: Archive,
  }

  // Register each icon as a global component
  for (const [name, component] of Object.entries(icons)) {
    nuxtApp.vueApp.component(name, component)
  }
})
