#!/usr/bin/env python
"""
Library for parsing the data from: https://www.worldometers.info/
"""

import logging
import csv
import json
import requests
from io import StringIO
from bs4 import BeautifulSoup
from pprint import pprint
import pandas


class WorldOMeters:
    """
    Handles the population-by-country from worldometers.
    """

    def __init__(self):
        """
        Sets up initial variables on the source of the data
        """
        self.logger = logging.getLogger("world_population")
        raw_https_base_url = "www.worldometers.info/world-population/"
        self.global_population_url = "https://{}/{}".format(
            raw_https_base_url,
            "population-by-country")

    def load_default_datasources(self):
        """
        Performs http requests to load the data from the configured URLs.
        The data is loaded into strings which can later be parsed
        """
        self.logger.info("INIT load_default_datasources")
        self.logger.debug("Downloading Global Population from %s",
                          self.global_population_url)
        global_population_req = requests.get(self.global_population_url)
        soup = BeautifulSoup(global_population_req.content, features="html.parser")
        countries = soup.find_all("table")[0]
        data_frame = pandas.read_html(str(countries))[0]
        # The data frame data looks like:
        #        # Country (or dependency)  Population (2020) Yearly Change  Net Change  Density (P/Km_)  Land Area (Km_)  Migrants (net) Fert. Rate Med. Age Urban Pop % World Share
        # 0      1                   China         1439323776        0.39 %     5540090              153          9388211       -348399.0        1.7       38        61 %     18.47 %
        # 1      2                   India         1380004385        0.99 %    13586631              464          2973190       -532687.0        2.2       28        35 %     17.70 %
        res = dict()
        countries = data_frame["Country (or dependency)"]
        populations = data_frame["Population (2020)"]
        row_number = 0
        for country in countries:
            res[country] = populations[row_number]
            row_number+=1
        self.global_population_dataset = res
        self.logger.info("DONE load_default_datasources")

    def parse_header(self, header_array, USFileType=False):
        """
        The header line is composed of:
        XXX
        :param header_array list: The header line split into a list
        """
