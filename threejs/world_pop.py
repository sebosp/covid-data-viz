from world_population import WorldOMeters
import logging

def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("main transform")
    world_pop_handler = WorldOMeters(logger)
    world_pop_handler.load_default_datasources()

if __name__ == "__main__":
    main()
