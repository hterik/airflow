import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Container,
  Flex,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Tr,
  useTheme,
} from "@chakra-ui/react";
import React, { useRef } from "react";
import useTaskInstances, {
  UseTaskInstanceResult,
} from "src/api/useTaskInstances";
import { GanttInner, Timeline } from "src/dag/details/gantt";
import type { RowData } from "src/dag/details/gantt/Row";
import type { TaskInstance } from "src/types";
import FilterBar from "./FilterBar";
import { Filters, useFilters } from "./useFilters";
import type { UseQueryResult } from "react-query";
import { useDebounce } from "use-debounce";
import { isEqual } from "lodash";

interface HostTaskList {
  name: string;
  items: RowItemData[];
}

export const ClusterGantt = () => {
  const { filters } = useFilters();
  const [debouncedFilters, debounceState] = useDebounce(filters, 200, {
    equalityFn: isEqual,
  });

  const dags = useTaskInstances({
    enabled: true,
    filters: {
      startDate: debouncedFilters.startDate,
      endDate: debouncedFilters.endDate,
      numRuns: debouncedFilters.numRuns,
    },
  });

  return (
    <Box width="100%">
      <FilterBar
        loading={
          dags.isLoading || dags.isPreviousData || debounceState.isPending()
        }
      />
      <HostTimeline dags={dags} filters={debouncedFilters} />
    </Box>
  );
};

const HostTimeline = ({
  dags,
  filters,
}: {
  dags: UseQueryResult<UseTaskInstanceResult>;
  filters: Filters;
}) => {
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  if (dags.isError || !dags.data) {
    return (
      <b>
        Error fetching task instances{" "}
        {dags.error?.toString() || "unknown error"}
      </b>
    );
  }

  const hosts: { [hostname: string]: HostTaskList } = {};

  for (let ti of dags.data.tis) {
    let host = (hosts[ti.hostname || "unknown"] = hosts[
      ti.hostname || "unknown"
    ] || {
      name: ti.hostname,
      items: [],
    });

    let url =
      `dags/${ti.dagId}/grid?` +
      new URLSearchParams({
        dag_run_id: ti.runId,
        task_id: ti.taskId,
        tab: "gantt",
      }).toString();

    host.items.push({
      instance: ti,
      task: {
        id: ti.taskId,
        label: ti.dagId + " _ " + ti.taskId,
      },
      href: url,
      title: <Box><b>{ti.dagId}</b> {ti.taskId}</Box>
    });
  }

  const sortedKeys = Object.keys(hosts);
  sortedKeys.sort();
  const rowData: RowData[] = sortedKeys.map((name) => {
    const host = hosts[name];
    return {
      isOpen: true,
      children: [],
      isSelected: false,
      items: host.items,
    };
  });

  return (
    <Box>
      <Box width="100%">
        {dags.data.warnings.map((warning: string) => (
          <Alert status="error" key={warning}>
            <AlertIcon />
            <AlertTitle>{warning}</AlertTitle>
          </Alert>
        ))}
      </Box>

      <Flex width="100%">
        <Box ref={gridScrollRef} height="300px" width="150px">
          {/* Add some padding so the timeline can fit*/}
          <Box height={50}></Box>
          <HostNameTable hosts={sortedKeys} />
        </Box>
        <Box position="relative" height="100%" overflow="hidden" width={"100%"}>
          <GanttInner
            rowData={rowData}
            ganttScrollRef={ganttScrollRef}
            gridScrollRef={gridScrollRef}
            onSelect={() => {}}
            startDate={filters.startDate.toISOString()}
            endDate={filters.endDate.toISOString()}
            openGroupIds={[]}
          />
        </Box>
      </Flex>
    </Box>
  );
};

const HostNameTable = ({ hosts }: { hosts: string[] }) => {
  const { colors } = useTheme();
  const isSelected = false;
  const hoverBlue = `${colors.blue[100]}50`;

  return (
    <Table>
      <Tbody>
        {hosts.map((host) => {
          return (
            <Tr
              key={host}
              bg={isSelected ? "blue.100" : "inherit"}
              borderBottomWidth={1}
              borderBottomColor={"gray.200"}
              borderRightWidth="16px"
              borderRightColor={isSelected ? "blue.100" : "transparent"}
              role="group"
              _hover={!isSelected ? { bg: hoverBlue } : undefined}
              transition="background-color 0.2s"
            >
              <Td
                bg={isSelected ? "blue.100" : "white"}
                _groupHover={!isSelected ? { bg: "blue.50" } : undefined}
                p={0}
                transition="background-color 0.2s"
                lineHeight="18px"
                position="sticky"
                left={0}
                borderBottom={0}
                width="100%"
                zIndex={1}
              >
                <Box
                  width="150px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {host}
                </Box>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};
