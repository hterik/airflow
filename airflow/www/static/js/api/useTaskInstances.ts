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

import axios, { AxiosResponse } from "axios";
import type { API, TaskInstance } from "src/types";
import { useQuery } from "react-query";
import { useAutoRefresh } from "src/context/autorefresh";

import { getMetaValue } from "src/utils";
import type { SetOptional } from "type-fest";

/* GridData.TaskInstance and API.TaskInstance are not compatible at the moment.
 * Remove this function when changing the api response for grid_data_url to comply
 * with API.TaskInstance.
 */
const convertTaskInstance = (ti: API.TaskInstance) =>
  ({ ...ti, 
    //runId: ti.run_id 
  } as TaskInstance);

const taskInstanceApi = getMetaValue("task_instance_api");

interface Props{    
  enabled: boolean,
  filters: {
    startDate: Date,
    endDate: Date,
    numRuns: number,
  }
}
interface ApiResponse {
  tis: API.TaskInstance[];
  warnings: string[];
}
export interface UseTaskInstanceResult {
  tis: TaskInstance[];
  warnings: string[]
}

const useTaskInstances = ({  
  enabled,
  filters
}: Props) => {
  const serializedFilters = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value instanceof Date) {
      serializedFilters.set(key, value.toISOString())
    } else {
    serializedFilters.set(key, value.toString())
    }
  }
  let url = "object/ti_data?" + serializedFilters.toString();

  //const { isRefreshOn } = useAutoRefresh();
  const isRefreshOn = false

  return useQuery<ApiResponse, unknown, UseTaskInstanceResult> (
    [url],
    () =>
      axios.get<AxiosResponse, ApiResponse>(url, {
        headers: { Accept: "text/plain" },
      }),
    {
      keepPreviousData: true,
      refetchInterval: isRefreshOn && (autoRefreshInterval || 1) * 1000,
      enabled,
      select: (x: ApiResponse): UseTaskInstanceResult => {
        if (!x){
          return {
            tis: [],
            warnings: ["Invalid response, maybe not logged in?"]
          }
        }
        return {
          tis: x["tis"].map(convertTaskInstance),
          warnings: x["warnings"]
        } 
      },
    }
  );
};

export default useTaskInstances;
