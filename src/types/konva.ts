import type { KonvaEventObject } from 'konva/lib/Node'

/** Covers both mouse and touch pointer events fired by Konva nodes */
export type KonvaPointerEvent = KonvaEventObject<MouseEvent | TouchEvent>

/** Drag event fired by Konva nodes */
export type KonvaDragEvent = KonvaEventObject<DragEvent>
