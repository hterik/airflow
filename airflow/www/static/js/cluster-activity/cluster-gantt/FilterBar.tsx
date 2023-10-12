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

/* global moment */

import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightElement,
  Select,
  Spinner,
} from "@chakra-ui/react";
import MultiSelect from "src/components/MultiSelect";
import React from "react";
import type { DagRun, RunState, TaskState } from "src/types";
import AutoRefresh from "src/components/AutoRefresh";
import type { Size } from "chakra-react-select";
import { useChakraSelectProps } from "chakra-react-select";

import { useTimezone } from "src/context/timezone";
import { isoFormatWithoutTZ } from "src/datetime_utils";
import { getNowRoundedToNextClosest15min, useFilters } from "./useFilters";
import type { DurationInputArg2 } from "moment";

const filtersOptions = {
  numRuns: [25, 100, 200, 500, 1000],
  timeRanges: ["1h", "2h", "3h", "4h", "8h", "12h", "24h", "2d"],
};

export const FilterBar = ({loading}: {loading: boolean}) => {
  const { filters, dispatchers } = useFilters();

  const { timezone } = useTimezone();
  // @ts-ignore
  const time = moment(filters.endDate);
  // @ts-ignore
  const formattedTime = time.tz(timezone).format(isoFormatWithoutTZ);

  const inputStyles: { backgroundColor: string; size: Size } = {
    backgroundColor: "white",
    size: "lg",
  };

  const addTime = (amount: number, amountUnit: DurationInputArg2) => {
    const nextTime = moment(filters.endDate).add(amount, amountUnit)
    const formattedNextTime = nextTime.tz(timezone).format(isoFormatWithoutTZ)
    dispatchers.onBaseDateChange(formattedNextTime)
  }

  return (
    <Flex
      backgroundColor="blackAlpha.200"
      mt={4}
      p={4}
      justifyContent="space-between"
    >
      <Flex>
        <Box px={2}>
          <FormControl>
            <FormLabel>End date</FormLabel>
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button {...inputStyles} onClick={() => addTime(-8, "h")}>-8h</Button>
              <Button {...inputStyles} onClick={() => addTime(-2, "h")}>-2h</Button>

              <Input
                {...inputStyles}
                type="datetime-local"
                value={formattedTime || ""}
                onChange={(e) => dispatchers.onBaseDateChange(e.target.value)}
              />
              <Button {...inputStyles} onClick={() => addTime(2, "h")} >+2h</Button>
              <Button {...inputStyles} onClick={() => addTime(8, "h")}>+8h</Button>
              <Button {...inputStyles} onClick={() => dispatchers.onBaseDateChange(moment(getNowRoundedToNextClosest15min()).tz(timezone).format(isoFormatWithoutTZ))}>now</Button>
            </ButtonGroup>
          </FormControl>
        </Box>
        <Box px={2}>
          <FormControl>
            <FormLabel>Time range</FormLabel>
            <Select
              {...inputStyles}
              placeholder="Time range"
              value={filters.timeRange || ""}
              onChange={(e) => dispatchers.onTimeRangeChange(e.target.value)}
            >
              {filtersOptions.timeRanges.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box px={2}>
          <FormControl>
            <FormLabel>Max nr runs</FormLabel>
            <Select
              {...inputStyles}
              placeholder="Runs"
              value={filters.numRuns || ""}
              onChange={(e) => dispatchers.onNumRunsChange(e.target.value)}
            >
              {filtersOptions.numRuns.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box px={2}>
            {loading ? <Spinner color="blue.500" speed="1s" mr="4px" size="xl" />: null}
        </Box>
      </Flex>
    </Flex>
  );
};

export default FilterBar;
