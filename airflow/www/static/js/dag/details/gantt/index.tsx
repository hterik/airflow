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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertIcon, Box, Divider, Text } from "@chakra-ui/react";

import useSelection from "src/dag/useSelection";
import { useGridData } from "src/api";
import Time from "src/components/Time";
import { getDuration } from "src/datetime_utils";

import Row, { RowData, SelectionCallback } from "./Row";
import type { Task } from "src/types";
import { isEqual } from "lodash";

interface Props {
  openGroupIds: string[];
  gridScrollRef: React.RefObject<HTMLDivElement>;
  ganttScrollRef: React.RefObject<HTMLDivElement>;
}

const Gantt = ({ openGroupIds, gridScrollRef, ganttScrollRef }: Props) => {
  const {
    data: { dagRuns, groups },
  } = useGridData();
  const { selected, onSelect } = useSelection();  

  const { startDate, endDate, rowData } = selectionToRowData(
    groups,
    dagRuns,
    selected,
    openGroupIds
  );

  if (!selected.runId)
  {
    return (
      <Alert status="warning" position="absolute" top={2}>
        <AlertIcon />
        Please select a dag run in order to see a gantt chart
      </Alert>
    )
  }
  return <GanttInner  gridScrollRef={gridScrollRef} ganttScrollRef={ganttScrollRef} rowData={rowData} startDate={startDate} endDate={endDate} onSelect={onSelect} />

}

export const GanttInner = ({ gridScrollRef, ganttScrollRef, rowData, startDate, endDate, onSelect, openGroupIds }: Props) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState("100%");
  const [prevRowData, setPrevRowData] = useState({startDate, endDate, rowData, openGroupIds});
  

  const calculateGanttDimensions = useCallback(() => {
    if (ganttRef?.current) {
      const tbody = gridScrollRef.current?.getElementsByTagName("tbody")[0];
      const tableTop =
        (tbody?.getBoundingClientRect().top || 0) +
        (gridScrollRef?.current?.scrollTop || 0);
      const ganttRect = ganttRef?.current?.getBoundingClientRect();
      const offsetTop = ganttRect?.top;
      setTop(tableTop && offsetTop ? tableTop - offsetTop : 0);
      if (ganttRect?.width) setWidth(ganttRect.width);
      const gridHeight = gridScrollRef.current?.getBoundingClientRect().height;
      if (gridHeight) setHeight(`${gridHeight - 155}px`);
    }
  }, [ganttRef, gridScrollRef]);


  const onGridScroll = (e: Event) => {
    const { scrollTop } = e.currentTarget as HTMLDivElement;
    if (scrollTop && ganttScrollRef?.current) {
      ganttScrollRef.current.scrollTo(0, scrollTop);

      // Double check scroll position after 100ms
      setTimeout(() => {
        const gridScrollTop = gridScrollRef.current?.scrollTop;
        const ganttScrollTop = ganttScrollRef.current?.scrollTop;
        if (ganttScrollTop !== gridScrollTop && ganttScrollRef.current) {
          ganttScrollRef.current.scrollTo(0, gridScrollTop || 0);
        }
      }, 100);
    }
  };

  // Sync grid and gantt scroll
  useEffect(() => {
    const grid = gridScrollRef.current;
    grid?.addEventListener("scroll", onGridScroll);
    return () => {
      grid?.removeEventListener("scroll", onGridScroll);
    };
  });

  // Calculate top, height and width on resize
  useEffect(() => {
    const ganttChart = ganttRef.current;
    const ganttObserver = new ResizeObserver(calculateGanttDimensions);

    if (ganttChart) {
      ganttObserver.observe(ganttChart);
      return () => {
        ganttObserver.unobserve(ganttChart);
      };
    }
    return () => {};
  }, [ganttRef, calculateGanttDimensions]);

  // openGroupIds need to be part of the dependency array to recalculate the gantt chart when the groups are toggled in grid
  if (!isEqual(prevRowData, {startDate, endDate, rowData, openGroupIds})) {  
    calculateGanttDimensions()
    setPrevRowData({startDate, endDate, rowData, openGroupIds});
  }

  return (
    <Box ref={ganttRef} position="relative" height="100%" overflow="hidden">
      
      <Timeline
        ganttScrollRef={ganttScrollRef}
        rowData={rowData}
        top={top}
        width={width}
        height={height}
        onSelect={onSelect}
        startDate={startDate}
        endDate={endDate}
      />
    </Box>
  );
};

export const Timeline = ({
  rowData,
  ganttScrollRef,
  top,
  width,
  height,
  onSelect,
  startDate,
  endDate,
}: {
  rowData: RowData[];
  ganttScrollRef: React.RefObject<HTMLDivElement>;
  top: number;
  width: number;
  height: string;
  onSelect: SelectionCallback;
  startDate: string | undefined | null;
  endDate: string | undefined | null;
}) => {
  return (
    <>
      <TimelineTimeBar
        width={width}
        startDate={new Date(startDate)}
        endDate={new Date(endDate)}
        top={top}
        height={height}
      />
      <Box
        
        height="100%"
        overflowY="scroll"
        ref={ganttScrollRef}
        overscrollBehavior="contain"
      >
        <div>
          {rowData.map((c) => (
            <Row
              ganttWidth={width}
              rowData={c}
              ganttStartDate={startDate}
              ganttEndDate={endDate}
              onSelect={onSelect}
              key={`gantt-${c.id}`}
            />
          ))}
        </div>
      </Box>
    </>
  );
};

const TimelineTimeBar = ({
  startDate,
  endDate,
  width,
  top,
  height,
}: {
  startDate: Date;
  endDate: Date;
  width: number;
  top: number;
  height: string;
}) => {
  const numBars = Math.round(width / 100);
  const runDuration = getDuration(startDate, endDate);
  const intervals = runDuration / numBars;

  return (
    <Box borderBottomWidth={1} pt={`${top}px`} pointerEvents="none">
      {Array.from(Array(numBars)).map((_, i) => (
        <Box
          position="absolute"
          left={`${(width / numBars) * i}px`}
          // eslint-disable-next-line react/no-array-index-key
          key={i}
        >
          <Text
            color="gray.400"
            fontSize="sm"
            transform="rotate(-30deg) translateX(28px)"
            mt={-6}
            mb={1}
            ml={-9}
          >
            <Time
              // @ts-ignore
              dateTime={moment(startDate)
                .add(i * intervals, "milliseconds")
                .format()}
              format="HH:mm:ss z"
            />
          </Text>
          <Divider orientation="vertical" height={height} />
        </Box>
      ))}
      <Box position="absolute" left={width - 2} key="end">
        <Divider orientation="vertical" height={height} />
      </Box>
    </Box>
  );
};

const selectionToRowData = (groups, dagRuns, selected, openGroupIds) => {
  // Take griddata, extract the selected runid and transform into RowData format required by TimeLine
  const dagRun = dagRuns.find((dr) => dr.runId === selected.runId);
  const rowData: RowData[] = [];

  const walkTaskGroups = (task: Task): RowData => {
    const d = {
      items: task.instances
        .filter((ti) => ti.runId === selected.runId)
        .map((ti) => {
          return {
            isSelected: ti.taskId === selected.taskId,
            instance: ti,
            task: task,
          };
        }),
      children: task.children?.map((t) => walkTaskGroups(t)) || [],
      isOpen: openGroupIds.includes(task.id || ""),
    };
    return d;
  };

  for (const task of groups.children || []) {
    rowData.push(walkTaskGroups(task));
  }
  let dagStartDate = dagRun?.queuedAt || dagRun?.startDate;
  let dagEndDate = dagRun?.endDate;
  let { startDate, endDate } = findDateBoundaries(
    dagStartDate,
    dagEndDate,
    rowData
  );
  return { startDate, endDate, rowData };
};

const findDateBoundaries = (
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  rowData: RowData[]
) => {
  // Check if any task instance dates are outside the bounds of the dag run dates and update our min start and max end

  for (const row of rowData) {
    for (const item of row.items) {
      const taskInstance = item.instance;

      if (
        taskInstance?.queuedDttm &&
        (!startDate ||
          Date.parse(taskInstance.queuedDttm) < Date.parse(startDate))
      ) {
        startDate = taskInstance.queuedDttm;
      } else if (
        taskInstance?.startDate &&
        (!startDate ||
          Date.parse(taskInstance.startDate) < Date.parse(startDate))
      ) {
        startDate = taskInstance.startDate;
      }

      if (
        taskInstance?.endDate &&
        (!endDate || Date.parse(taskInstance.endDate) > Date.parse(endDate))
      ) {
        endDate = taskInstance.endDate;
      }
    }
  }
  return { endDate, startDate };
};

export default Gantt;
