#!/bin/bash

docker exec -i dg01 python manage.py shell < model_test.py
