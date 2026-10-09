## /home/karem/scripts/log-reader.py ##

import os

ENV_KEY = os.environ.get("SIM_KEY")

simulated_log = "/var/sim/sim.log"

error_count = 0

try:
    with open(simulated_log, "r") as f:
        for line in f:
            if line.lstrip().startswith('"ERROR', 0):
                error_count += 1
                print(line)
    print(error_count)
    print(ENV_KEY) # I know we shouldn't print or give the user an environment variable but this is for demonstration only
except Exception as e:
    print(f"An un excepected error occurred: {e}")
~
~
