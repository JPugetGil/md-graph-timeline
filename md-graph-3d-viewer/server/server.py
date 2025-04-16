from flask import Flask, send_from_directory, send_file, request, abort
import re
import os
import random

app = Flask(__name__, static_url_path='')


@app.route('/static/<path:path>')
def send_report(path):
    return send_from_directory('../static/', path)

@app.route('/api/get_random_version')
def get_random_version():
    path = '../static/data/graphs/'
    # get folders names
    folders = os.listdir(path)
    # return a random one
    random_index = random.randint(0, len(folders) - 1)
    return folders[random_index]

@app.route('/api/get_file_content', methods=['POST'])
def get_file_content():
    # Sanitize path
    pattern = r'\.\.?\/'
    # get env variable
    path = '../static/data/graphs/' + re.sub(pattern, '', request.get_json()['path'])
    print("Request to path : " + path)
    return get_file_and_return(path)


def get_file_and_return(path):
    extensions = ['jpg', 'jpeg', 'png', 'gif', 'JPG', 'JPEG', 'PNG', 'GIF']
    for extension in extensions:
        if (path.endswith(extension)):
            try:
                return send_file(path)
            except:
                abort(404)
    else:
        try:
            file = open(path, mode='r')
            all_of_it = file.read()
            file.close()
            return all_of_it
        except:
            abort(404)
