#!/usr/bin/env python
"""
This file transforms 
https://github.com/CSSEGISandData/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv
into a format that contains, for each location, a cumulative, daily and daily delta fields

TODO:
    - If the date keys from several files do not match and they are joined, the data doesn't make sense.
      We should find a way to find consistency between datasets to avoid this confusion.
"""

import logging
from CSSEGISandData import CSSEGISandDataHelper


def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("main transform")
    csse_handler = CSSEGISandDataHelper(logger)
    csse_handler.load_default_datasources()
    csse_handler.process_confirmed()
    csse_handler.process_deaths()
    csse_handler.process_recovered()


if __name__ == "__main__":
    main()
