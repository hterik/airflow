import moment, { DurationInputArg2 } from "moment";
import { useSearchParams } from "react-router-dom";

export type Filters = {
    endDate: Date;
    startDate: Date;
    timeRange: string;
    numRuns: number;
}

export interface UtilFunctions {
    onBaseDateChange: (value: string) => void;
    onNumRunsChange: (value: string) => void;    
    onTimeRangeChange: (value: string) => void;
  }
  
  export interface FilterHookReturn {
    filters: Filters;
    dispatchers: UtilFunctions 
  }

export const BASE_DATE_PARAM = "base_date";
export const NUM_RUNS_PARAM = "num_runs";
export const TIME_RANGE_PARAM = "time_range";
const defaultDagRunDisplayNumber = 200
const defaultTimeRange = "4h"


export const getNowRoundedToNextClosest15min = (): Date => {
    const date = new Date();
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setMinutes(Math.ceil(date.getMinutes() / 15 +1) * 15)
    return date
}

export const now = getNowRoundedToNextClosest15min().toISOString();

export const useFilters = (): FilterHookReturn => {
    const [searchParams, setSearchParams] = useSearchParams();
  
    const endDate =
      searchParams.get(BASE_DATE_PARAM) ||
      now;
    const numRuns =
      searchParams.get(NUM_RUNS_PARAM) || defaultDagRunDisplayNumber.toString();  
    let timeRange =
      searchParams.get(TIME_RANGE_PARAM) || defaultTimeRange;    
  
    const makeOnChangeFn =
      (paramName: string, formatFn?: (arg: string) => string) =>
      (value: string) => {
        const formattedValue = formatFn ? formatFn(value) : value;
  
        if (formattedValue) searchParams.set(paramName, formattedValue);
        else searchParams.delete(paramName);
  
        setSearchParams(searchParams);
      };

    const onBaseDateChange = makeOnChangeFn(
      BASE_DATE_PARAM,
      // @ts-ignore
      (localDate: string) => moment(localDate).utc().format()
    );
    const onNumRunsChange = makeOnChangeFn(NUM_RUNS_PARAM);
    const onTimeRangeChange = makeOnChangeFn(TIME_RANGE_PARAM);

    const endDateParsed = moment(endDate)

    const [deltaTime, deltaTimeUnit] = parseTimeRange(timeRange)
    const startDateParsed = moment(endDateParsed).subtract(deltaTime, deltaTimeUnit)
      
    return {
      filters: {
        endDate: endDateParsed.toDate(),
        startDate: startDateParsed.toDate(),
        numRuns: parseInt(numRuns, 10),
        timeRange
      },
      dispatchers: {
        onBaseDateChange,
        onNumRunsChange,
        onTimeRangeChange
      }
    };
  };

const parseTimeRange = (timeRange: string): [number, DurationInputArg2] => {
    const timeRangeParts = timeRange.match(/(\d+)(\w)/)
    if (timeRangeParts === null) {
        return [4, "h"]
    }
    
    let [_fullMatch, time, unit] = timeRangeParts
    return [parseInt(time, 10), unit as DurationInputArg2]
    
}