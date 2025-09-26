/**
 * TypeScript interfaces for all Mermaid diagram types
 * Provides type safety and IntelliSense for diagram creation
 */

// ============================================
// Enums for Type Safety
// ============================================

export enum MermaidTheme {
  DEFAULT = 'default',
  DARK = 'dark',
  FOREST = 'forest',
  NEUTRAL = 'neutral',
  BASE = 'base'
}

export enum SecurityLevel {
  STRICT = 'strict',
  LOOSE = 'loose',
  ANTISCRIPT = 'antiscript',
  SANDBOX = 'sandbox'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum FlowchartDirection {
  TOP_DOWN = 'TD',
  TOP_BOTTOM = 'TB',
  BOTTOM_TOP = 'BT',
  RIGHT_LEFT = 'RL',
  LEFT_RIGHT = 'LR'
}

export enum FlowchartCurve {
  BASIS = 'basis',
  LINEAR = 'linear',
  CARDINAL = 'cardinal'
}

export enum NodeShape {
  RECTANGLE = 'rectangle',
  ROUNDED = 'rounded',
  STADIUM = 'stadium',
  SUBROUTINE = 'subroutine',
  CYLINDRICAL = 'cylindrical',
  CIRCLE = 'circle',
  RHOMBUS = 'rhombus',
  HEXAGON = 'hexagon',
  PARALLELOGRAM = 'parallelogram',
  TRAPEZOID = 'trapezoid'
}

export enum ConnectionType {
  ARROW = 'arrow',
  OPEN = 'open',
  DOTTED = 'dotted',
  THICK = 'thick'
}

export enum ParticipantType {
  PARTICIPANT = 'participant',
  ACTOR = 'actor',
  DATABASE = 'database'
}

export enum InteractionType {
  SOLID = 'solid',
  DOTTED = 'dotted',
  ASYNC = 'async'
}

export enum ClassVisibility {
  PUBLIC = '+',
  PRIVATE = '-',
  PROTECTED = '#',
  PACKAGE = '~'
}

export enum ClassRelationType {
  INHERITANCE = 'inheritance',
  COMPOSITION = 'composition',
  AGGREGATION = 'aggregation',
  ASSOCIATION = 'association',
  REALIZATION = 'realization',
  DEPENDENCY = 'dependency'
}

export enum StateType {
  NORMAL = 'normal',
  CHOICE = 'choice',
  FORK = 'fork',
  JOIN = 'join',
  COMPOSITE = 'composite'
}

export enum ERRelationType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_ONE = 'many-to-one',
  MANY_TO_MANY = 'many-to-many'
}

export enum ERConstraint {
  PRIMARY_KEY = 'PK',
  FOREIGN_KEY = 'FK',
  UNIQUE_KEY = 'UK',
  NOT_NULL = 'NOT NULL',
  AUTO_INCREMENT = 'AUTO_INCREMENT'
}

export enum CommitType {
  NORMAL = 'normal',
  REVERSE = 'reverse',
  HIGHLIGHT = 'highlight'
}

export enum GanttTaskStatus {
  DONE = 'done',
  ACTIVE = 'active',
  CRITICAL = 'crit',
  MILESTONE = 'milestone'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ServiceType {
  INTERNET = 'internet',
  SERVER = 'server',
  DATABASE = 'database',
  DISK = 'disk',
  QUEUE = 'queue',
  FUNCTION = 'function'
}

export enum GroupType {
  CLOUD = 'cloud',
  DATABASE = 'database',
  SERVER = 'server',
  CLIENT = 'client'
}

export enum Direction {
  LEFT = 'L',
  RIGHT = 'R',
  TOP = 'T',
  BOTTOM = 'B'
}

export enum RequirementType {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  INTERFACE = 'interface',
  DESIGN = 'design'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum VerifyMethod {
  TEST = 'test',
  ANALYSIS = 'analysis',
  INSPECTION = 'inspection',
  DEMONSTRATION = 'demonstration'
}

export enum ElementType {
  MODULE = 'module',
  COMPONENT = 'component',
  SYSTEM = 'system',
  INTERFACE = 'interface'
}

export enum RequirementRelationType {
  SATISFIES = 'satisfies',
  DERIVES = 'derives',
  REFINES = 'refines',
  TRACES = 'traces',
  CONTAINS = 'contains'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  SCATTER = 'scatter'
}

export enum AxisType {
  CATEGORY = 'category',
  VALUE = 'value',
  TIME = 'time'
}

export enum NotePosition {
  LEFT_OF = 'left of',
  RIGHT_OF = 'right of',
  OVER = 'over'
}

export enum MindMapShape {
  CIRCLE = 'circle',
  SQUARE = 'square',
  HEXAGON = 'hexagon',
  CLOUD = 'cloud'
}

export enum JourneyRating {
  VERY_BAD = 1,
  BAD = 2,
  NEUTRAL = 3,
  GOOD = 4,
  VERY_GOOD = 5
}

export enum QuadrantNumber {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4
}

// ============================================
// Core Configuration
// ============================================

export interface MermaidConfig {
  theme?: MermaidTheme
  themeVariables?: {
    primaryColor?: string
    primaryTextColor?: string
    primaryBorderColor?: string
    lineColor?: string
    secondaryColor?: string
    tertiaryColor?: string
    background?: string
    mainBkg?: string
    secondBkg?: string
    tertiaryBkg?: string
    darkMode?: boolean
    fontSize?: number
  }
  startOnLoad?: boolean
  securityLevel?: SecurityLevel
  logLevel?: LogLevel
  flowchart?: {
    htmlLabels?: boolean
    curve?: FlowchartCurve
    padding?: number
    nodeSpacing?: number
    rankSpacing?: number
  }
  gantt?: {
    numberSectionStyles?: number
    fontSize?: number
    gridLineStartPadding?: number
    leftPadding?: number
  }
}

// ============================================
// Core Diagram Types
// ============================================

// Flowchart / Graph
export interface FlowchartData {
  title?: string
  direction?: FlowchartDirection
  nodes: FlowchartNode[]
  connections: FlowchartConnection[]
}

export interface FlowchartNode {
  id: string
  label: string
  shape?: NodeShape
  style?: string
  class?: string
}

export interface FlowchartConnection {
  from: string
  to: string
  label?: string
  type?: ConnectionType
}

// Sequence Diagram
export interface SequenceData {
  title?: string
  participants: SequenceParticipant[]
  interactions: SequenceInteraction[]
  notes?: SequenceNote[]
  loops?: SequenceLoop[]
  alts?: SequenceAlt[]
}

export interface SequenceParticipant {
  id: string
  label: string
  type?: ParticipantType
}

export interface SequenceInteraction {
  from: string
  to: string
  message: string
  type?: InteractionType
  activation?: boolean
}

export interface SequenceNote {
  position: NotePosition
  participant: string
  text: string
}

export interface SequenceLoop {
  label: string
  interactions: SequenceInteraction[]
}

export interface SequenceAlt {
  condition: string
  interactions: SequenceInteraction[]
  else?: SequenceInteraction[]
}

// Class Diagram
export interface ClassData {
  title?: string
  classes: ClassDefinition[]
  relationships: ClassRelationship[]
}

export interface ClassDefinition {
  name: string
  properties: ClassProperty[]
  methods: ClassMethod[]
  abstract?: boolean
  interface?: boolean
}

export interface ClassProperty {
  name: string
  type: string
  visibility?: ClassVisibility
  static?: boolean
}

export interface ClassMethod {
  name: string
  parameters?: string[]
  returnType?: string
  visibility?: ClassVisibility
  abstract?: boolean
  static?: boolean
}

export interface ClassRelationship {
  from: string
  to: string
  type: ClassRelationType
  label?: string
  multiplicity?: string
}

// State Diagram
export interface StateData {
  title?: string
  states: StateDefinition[]
  transitions: StateTransition[]
  initialState?: string
  finalState?: string
}

export interface StateDefinition {
  id: string
  label: string
  type?: StateType
  substates?: StateDefinition[]
}

export interface StateTransition {
  from: string
  to: string
  trigger: string
  guard?: string
  action?: string
}

// Entity Relationship Diagram
export interface ERData {
  title?: string
  entities: EREntity[]
  relationships: ERRelationship[]
}

export interface EREntity {
  name: string
  attributes: ERAttribute[]
}

export interface ERAttribute {
  name: string
  type: string
  constraints?: ERConstraint[]
}

export interface ERRelationship {
  from: string
  to: string
  type: ERRelationType
  label: string
}

// Git Graph
export interface GitGraphData {
  title?: string
  commits: GitCommit[]
  branches: GitBranch[]
  merges: GitMerge[]
  tags?: GitTag[]
}

export interface GitCommit {
  id: string
  message: string
  branch?: string
  tag?: string
  type?: CommitType
}

export interface GitBranch {
  name: string
  from?: string
}

export interface GitMerge {
  from: string
  to: string
  id?: string
  tag?: string
}

export interface GitTag {
  name: string
  commit: string
}

// Pie Chart
export interface PieData {
  title: string
  slices: PieSlice[]
}

export interface PieSlice {
  label: string
  value: number
  color?: string
}

// ============================================
// Project Management Diagrams
// ============================================

// Timeline
export interface TimelineData {
  title: string
  entries: TimelineEntry[]
}

export interface TimelineEntry {
  period: string
  events: string[]
}

// Gantt Chart
export interface GanttData {
  title: string
  dateFormat?: string
  excludes?: ('weekends' | 'friday' | string)[]
  sections: GanttSection[]
}

export interface GanttSection {
  name: string
  tasks: GanttTask[]
}

export interface GanttTask {
  name: string
  id: string
  startDate?: string
  endDate?: string
  after?: string
  duration?: string
  status?: GanttTaskStatus
}

// Kanban Board
export interface KanbanData {
  title: string
  columns: KanbanColumn[]
}

export interface KanbanColumn {
  name: string
  cards: KanbanCard[]
  limit?: number
}

export interface KanbanCard {
  id: string
  title: string
  assignee?: string
  labels?: string[]
  priority?: Priority
}

// User Journey
export interface UserJourneyData {
  title: string
  actor: string
  stages: JourneyStage[]
}

export interface JourneyStage {
  name: string
  steps: JourneyStep[]
}

export interface JourneyStep {
  action: string
  rating: JourneyRating
  actor: string
}

// ============================================
// Technical Diagrams
// ============================================

// Architecture Diagram
export interface ArchitectureData {
  title?: string
  groups: ArchitectureGroup[]
  services: ArchitectureService[]
  connections: ArchitectureConnection[]
}

export interface ArchitectureGroup {
  id: string
  name: string
  type: GroupType
}

export interface ArchitectureService {
  id: string
  name: string
  type: ServiceType
  group: string
}

export interface ArchitectureConnection {
  from: string
  to: string
  direction?: Direction
  label?: string
}

// Block Diagram
export interface BlockData {
  title?: string
  columns?: number
  blocks: BlockDefinition[]
  connections: BlockConnection[]
}

export interface BlockDefinition {
  id: string
  label: string
  type?: NodeShape
  column?: number
  row?: number
}

export interface BlockConnection {
  from: string
  to: string
  label?: string
  style?: ConnectionType
}

// Packet Diagram
export interface PacketData {
  title?: string
  bits: PacketBit[]
}

export interface PacketBit {
  range: string // e.g., "0-7", "8-15"
  label: string
  color?: string
}

// ============================================
// Business Analysis Diagrams
// ============================================

// Mind Map
export interface MindMapData {
  title?: string
  root: MindMapNode
}

export interface MindMapNode {
  label: string
  children?: MindMapNode[]
  icon?: string
  shape?: MindMapShape
}

// Quadrant Chart
export interface QuadrantData {
  title: string
  xAxis: QuadrantAxis
  yAxis: QuadrantAxis
  items: QuadrantItem[]
  quadrants?: QuadrantDefinition[]
}

export interface QuadrantAxis {
  label: string
  left: string
  right: string
}

export interface QuadrantItem {
  label: string
  x: number // 0 to 1
  y: number // 0 to 1
  size?: number
  color?: string
}

export interface QuadrantDefinition {
  number: QuadrantNumber
  label: string
  color?: string
}

// Tree Map
export interface TreeMapData {
  title: string
  root: TreeMapNode
}

export interface TreeMapNode {
  name: string
  value?: number
  children?: TreeMapNode[]
  color?: string
}

// Sankey Diagram
export interface SankeyData {
  title?: string
  flows: SankeyFlow[]
}

export interface SankeyFlow {
  source: string
  target: string
  value: number
  label?: string
}

// XY Chart
export interface XYChartData {
  title: string
  xAxis: XYAxis
  yAxis: XYAxis
  datasets: XYDataset[]
}

export interface XYAxis {
  label?: string
  values?: (string | number)[]
  min?: number
  max?: number
  type?: AxisType
}

export interface XYDataset {
  label: string
  type: ChartType
  data: (number | null)[]
  color?: string
  fill?: boolean
}

// Requirement Diagram
export interface RequirementData {
  title?: string
  requirements: RequirementDefinition[]
  elements: RequirementElement[]
  relationships: RequirementRelationship[]
}

export interface RequirementDefinition {
  id: string
  text: string
  type?: RequirementType
  risk?: RiskLevel
  verifyMethod?: VerifyMethod
}

export interface RequirementElement {
  id: string
  type: ElementType
  docref?: string
}

export interface RequirementRelationship {
  source: string
  target: string
  type: RequirementRelationType
}

// ============================================
// Rendering Options
// ============================================

export interface MermaidRenderOptions {
  container?: HTMLElement
  theme?: MermaidConfig['theme']
  fallback?: string | (() => string)
  onError?: (error: Error) => void
  onSuccess?: (svg: string) => void
  cache?: boolean
  lazyLoad?: boolean
}

// ============================================
// Helper Function Return Types
// ============================================

export interface MermaidDiagramResult {
  definition: string
  type: string
  isValid: boolean
  error?: string
}

export interface MermaidValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface MermaidRenderResult {
  success: boolean
  svg?: string
  error?: Error
  fallback?: string
}