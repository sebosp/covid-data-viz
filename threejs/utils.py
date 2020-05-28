"""
Shared utils for dataset handling
"""
import logging


def write_to_file(filename, content):
    """
    Writes some input content into an input filename
    """
    logging.info("INIT Writing %s", filename)
    with open(filename, "w") as file_handle:
        file_handle.write(content)
    logging.info("DONE writing %s", filename)

def merge_dict(lhs, rhs):
    """
    Merges two dictionaries
    :returns a new dict with the merged keys
    """
    return {**lhs, **rhs}


