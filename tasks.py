import os, shutil

from invoke import task, Exit 
from patchwork.transfers import rsync
from fabric import Connection

path = os.path.join

SRV_PATH = '/srv/www/ob/'

linode = Connection('linode')

@task
def deploy_beta(c):
    include = ['index.html', 'data', 'static', 'package.json', 'package-lock.json']
    tmp_dir = path(os.getcwd(), 'tmp/')

    # Clean and re-make, clean so shutil doesn't cry when moving files/dirs
    try:
        shutil.rmtree(tmp_dir)
    except: pass
    os.makedirs(tmp_dir, exist_ok=True)

    for f in include:
        if os.path.isdir(f):
            shutil.copytree(f , path(tmp_dir, f))
        else:
            shutil.copy(f, tmp_dir)
    
    srcdir = path(os.getcwd(), 'tmp/')
    destdir = path(SRV_PATH)

    exclude = []
    rsync(linode, srcdir, destdir, exclude=exclude)

    with linode.cd(destdir):
        linode.run('npm install --silent')
    #    pass
    shutil.rmtree(tmp_dir)

"""
@task
def deploy_server(c):
    # update folder except client/ dir
    # symlink should have worked
    # npm update
    # restart nginx/supervisor whatever
    include = ['server.js', 'package.json', 'package-lock.json']
    tmpdir = path(os.getcwd(), 'tmp/')

    # mv to tmp
    os.makedirs(tmpdir, exist_ok=True)
    for file in include:
        shutil.copy(file, tmpdir)

    rsync(linode, tmpdir, SRV_PATH)

    # run npm install
    with linode.cd(SRV_PATH):
        linode.run('npm install --silent')

    shutil.rmtree(tmpdir)

@task
def deploy(c):
    deploy_client(c)
    deploy_server(c)
"""

@task 
def start(c):
    linode.run('supervisorctl restart overburdened')
