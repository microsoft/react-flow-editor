import * as React from "react";
import { DragNodeController, TGetPositionFromEvent } from "../controllers";
import { GraphController } from "../controllers/GraphController";
import { PointerEventProvider } from "../event-provider/PointerEventProvider";
import { GraphNodeEvent } from "../models/event";
import { IContainerRect } from "../models/geometry";
import { NodeModel } from "../models/NodeModel";
import { isWithinThreshold } from "../utils";
import { EventChannel } from "../utils/eventChannel";
import { checkIsMultiSelect } from "../utils/keyboard";
import { isMouseButNotLeft } from "../utils/mouse";

export interface INodePointerDownParams {
  svgRef: React.RefObject<SVGSVGElement>;
  rectRef: React.RefObject<IContainerRect | undefined>;
  isNodesDraggable: boolean;
  isAutoAlignEnable: boolean;
  dragThreshold: number;
  getPositionFromEvent: TGetPositionFromEvent;
  isClickNodeToSelectDisabled: boolean;
  autoAlignThreshold: number;
  eventChannel: EventChannel;
  graphController: GraphController;
}

export const onNodePointerDown = (evt: React.PointerEvent, target: NodeModel, params: INodePointerDownParams) => {
  evt.preventDefault();

  const {
    svgRef,
    isNodesDraggable,
    getPositionFromEvent,
    isClickNodeToSelectDisabled,
    eventChannel,
    dragThreshold,
    rectRef,
    isAutoAlignEnable,
    autoAlignThreshold,
    graphController,
  } = params;

  if (isNodesDraggable) {
    evt.stopPropagation();
  }

  const isMouseRight = isMouseButNotLeft(evt);

  if (isClickNodeToSelectDisabled || isMouseRight) {
    return;
  }

  if (svgRef.current) {
    svgRef.current.focus({ preventScroll: true });
  }

  const isMultiSelect = checkIsMultiSelect(evt);

  const dragging = new DragNodeController(
    new PointerEventProvider(graphController.getGlobalEventTarget(), evt.pointerId),
    getPositionFromEvent,
    rectRef,
  );

  dragging.onMove = ({ dx, dy, totalDX, totalDY, e }) => {
    if (isNodesDraggable) {
      eventChannel.trigger({
        type: GraphNodeEvent.Drag,
        node: target,
        dx,
        dy,
        rawEvent: e,
        isVisible: !isWithinThreshold(totalDX, totalDY, dragThreshold),
        isAutoAlignEnable,
        autoAlignThreshold,
      });
    }
  };

  dragging.onEnd = ({ totalDX, totalDY, e }) => {
    graphController.pointerId = null;
    const isDragCanceled = isWithinThreshold(totalDX, totalDY, dragThreshold);

    if (isDragCanceled || !isNodesDraggable) {
      graphController.nodeClickOnce = target;
    }
    eventChannel.trigger({
      type: GraphNodeEvent.DragEnd,
      node: target,
      rawEvent: e,
      isDragCanceled,
    });

    if (isDragCanceled) {
      const simulatedEvent = new MouseEvent("click", e);
      (evt.currentTarget ?? evt.target)?.dispatchEvent(simulatedEvent);
    }
  };
  graphController.pointerId = evt.pointerId;
  if (evt.target instanceof Element && evt.pointerType !== "mouse") {
    evt.target.releasePointerCapture(evt.pointerId);
  }
  eventChannel.trigger({
    type: GraphNodeEvent.DragStart,
    node: target,
    rawEvent: evt,
    isMultiSelect,
  });
  dragging.start(evt.nativeEvent);
};
