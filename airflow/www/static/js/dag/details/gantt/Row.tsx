/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from "react";
import { Box, Tooltip, Flex, Link } from "@chakra-ui/react";
import useSelection, { SelectionProps } from "src/dag/useSelection";
import { getDuration } from "src/datetime_utils";
import { SimpleStatus, boxSize, boxSizePx } from "src/dag/StatusBox";
import { useContainerRef } from "src/context/containerRef";
import { hoverDelay } from "src/utils";
import type { Task, TaskInstance } from "src/types";
import GanttTooltip from "./GanttTooltip";

export interface RowItemData{
    isSelected: boolean
    instance: TaskInstance;
    task: Task
    href?: string
}

export interface RowData {
  isOpen: boolean
  items: RowItemData[];
  children?: RowData[];
}

export type SelectionCallback = (selection: SelectionProps) => void;

interface CommonProps {
  ganttWidth?: number;
  ganttStartDate?: string | null;
  ganttEndDate?: string | null;
  onSelect: SelectionCallback
}

interface Props extends CommonProps {
  rowData: RowData;  
} 

interface RowItemProps extends CommonProps {
  item: RowItemData;
}

const Row = ({
  ganttWidth = 500,
  rowData,
  onSelect,
  ganttStartDate,
  ganttEndDate,
}: Props) => {  
  const isSelected = rowData.items.some((it) => it.isSelected)
  const isOpen = rowData.isOpen

  return (
    <div>
      <Box
        py="4px"
        borderBottomWidth={1}
        borderBottomColor={!!rowData.children && isOpen ? "gray.400" : "gray.200"}
        bg={isSelected ? "blue.100" : "inherit"}       
        position="relative" 
        height={`${boxSize + 8}px`}
        overflow="hidden"
      >
        {rowData.items.map((item) => (
          <RowItem            
            key={item.instance.taskId + item.instance.runId + "-" + item.instance.tryNumber + "-" + item.instance.mapIndex}
            ganttWidth={ganttWidth}
            item={item}
            ganttStartDate={ganttStartDate}
            ganttEndDate={ganttEndDate}
            onSelect={onSelect}            
          />
        ))}
        {rowData.items.length == 0 ?  <Box height="10px" /> : null}
      </Box>
      {isOpen &&
        !!rowData.children &&
        rowData.children.map((c) => (
          <Row
            ganttWidth={ganttWidth}
            ganttStartDate={ganttStartDate}
            ganttEndDate={ganttEndDate}
            onSelect={onSelect}
            rowData={c}
            key={`gantt-${c.id}`}
          />
        ))}
    </div>
  );
};

const RowItem = ({
  ganttWidth = 500,
  item,
  ganttStartDate,
  ganttEndDate,
  onSelect
}: RowItemProps) => {

  const instance = item.instance;
  const task = item.task;

  const containerRef = useContainerRef();

  const runDuration = getDuration(ganttStartDate, ganttEndDate);

  const hasValidQueuedDttm =
    !!instance?.queuedDttm &&
    (instance?.startDate && instance?.queuedDttm
      ? instance.queuedDttm < instance.startDate
      : true);
  

  // Calculate durations in ms
  const taskDuration = getDuration(instance?.startDate, instance?.endDate);
  const queuedDuration = hasValidQueuedDttm
    ? getDuration(instance?.queuedDttm, instance?.startDate)
    : 0;
  const taskStartOffset = hasValidQueuedDttm
    ? getDuration(ganttStartDate, instance?.queuedDttm || instance?.startDate)
    : getDuration(ganttStartDate, instance?.startDate);

  // Percent of each duration vs the overall dag run
  const taskDurationPercent = taskDuration / runDuration;
  const taskStartOffsetPercent = taskStartOffset / runDuration;
  const queuedDurationPercent = queuedDuration / runDuration;

  // Calculate the pixel width of the queued and task bars and the position in the graph
  // Min width should be 5px
  let width = ganttWidth * taskDurationPercent;
  if (width < 5) width = 5;
  let queuedWidth = hasValidQueuedDttm ? ganttWidth * queuedDurationPercent : 0;
  if (hasValidQueuedDttm && queuedWidth < 5) queuedWidth = 5;
  const offsetMargin = taskStartOffsetPercent * ganttWidth;

  return <Tooltip
    label={<GanttTooltip task={task} instance={instance} />}
    hasArrow
    portalProps={{ containerRef }}
    placement="top"
    openDelay={hoverDelay}
  >
    <Link href={item.href}>
    <Flex
      width={`${width + queuedWidth}px`}
      cursor="pointer"
      pointerEvents="auto"
      left={`${offsetMargin}px`}
      top={"4px"}
      onClick={item.href ? undefined : () => {
        onSelect({
          runId: instance.runId,
          taskId: instance.taskId,
        });
      }}
      position="absolute"
    >
      {instance.state !== "queued" && hasValidQueuedDttm && (
        <SimpleStatus
          state="queued"
          width={`${queuedWidth}px`}
          borderRightRadius={0}
          // The normal queued color is too dark when next to the actual task's state
          opacity={0.6}
        />
      )}
      <SimpleStatus
        state={instance.state}
        width={`${width}px`}
        borderLeftRadius={
          instance.state !== "queued" && hasValidQueuedDttm ? 0 : undefined
        }
        overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap"
      >
        {item.title}
      </SimpleStatus>
    </Flex>
    </Link>
  </Tooltip>;
};

export default Row;
