---
assets_url: https://raw.githubusercontent.com/mlcommons/medperf/main/examples/chestxray_tutorial/
nv_assets_url: https://raw.githubusercontent.com/hasan7n/medperf/974879e8eee24ef673a3b0934c80d457ca1ed25c/examples/nvfl/fl/
---


# Hands-on Tutorial for Federated Training with Nvidia Flare

{% set prep_container = assets_url+"data_preparator/container_config.yaml" %}
{% set prep_container_params = assets_url+"data_preparator/container_config.yaml" %}

{% set train_container = nv_assets_url+"node/container_config.yaml" %}
{% set admin_train_container = nv_assets_url+"admin/container_config.yaml" %}

## Run in codespaces

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/mlcommons/medperf/tree/nvflare-integration?devcontainer_path=.devcontainer%2Ftraining%2Fdevcontainer.json){target="\_blank"}

After opening the link, proceed to creating the codespace without changing any option. It will take around 7 minutes to get the codespace up and running.

## Overview

In this guide, you will learn how you can run a training experiment with MedPerf and Nvidia Flare. You will play two roles in this tutorial: the role of an experiment admin, and the role of a data owner.

The main tasks of this guide are:

1. Experiment Admin: Training Experiment Definition
2. Experiment Admin: Aggregator Setup
3. Experiment Admin: training configuration
4. Experiment Admin: Starting the Aggregator
5. Data Owner: Registering and Preparing the Data
6. Data Owner: Requesting participation
7. Data Owner: Starting the training node
8. Data Owner: Setting up the second data owner
9. Experiment Admin: Starting the training
10. Experiment Admin: Remote status check
11. Experiment Admin: Stopping the training

## 1. Experiment Admin: Training Experiment Definition

First, login as the experiment admin to proceed:

```bash
medperf auth login -e testmo@example.com
```

You will first need to define the logic for data preparation, and the logic for training. Then, register the training experiment object.

### Register the data preparation Container

As an experiment admin, you should prepare the data preparation pipeline logic that will transform the raw clinical data into AI-ready data. For this tutorial, it will be a container that transforms chest x-ray images and disease labels into numpy arrays. The container is already prepared and hosted. Run the following command to register the container in the MedPerf server:

```bash
medperf container submit --name prep \
   --container-config-file "{{ prep_container }}" \
   --parameters-file "{{ prep_container_params }}"
```

Here is a description of what has been registered:

- The first URL (`-m` option) points to the container configuration file for the data preparation container. The configuration file contains information like the docker image identifier, and what will be mounted during runtime.
- The second URL (`-p` option) points to a parameters file. The data preparation container is built so that it expects certain parameters read from this file.

### Define the training Containers

As an experiment admin, you should prepare the necessary training code. Two containers are required: a container that will be used by the Aggregator server and the participating data owners, and a container used by you as an admin to manage the federation (i.e., check the status, start the training, stop the training, etc...).

For this tutorial, the containers are already prepared and hosted. Run the following commands below to register the containers in the MedPerf server. Again, the URL (`-m` option) points to the container configuration file. The configuration file contains information like the docker image identifier, and what will be mounted during runtime.

#### Register the Training nodes Container

```bash
medperf container submit --name trainer \
    --container-config-file "{{ train_container }}"
```

#### Register the Training admin Container

```bash
medperf container submit --name trainadmin \
    --container-config-file "{{ admin_train_container }}"
```

#### Register the Training Experiment

Note the IDs of the data preparation container, the training nodes container, and the training admin container. The IDs will be `2`, `3`, and `4` for this tutorial. You can check by running `medperf container ls --mine`.

Now submit the training experiment object, giving it a name, a description, and the containers mentioned above:

```bash
medperf training submit --name trainexp --description trainexp \
  --prep-container 2 \
  --fl-container 3 \
  --fl-admin-container 4
```

#### Associate a Certificate Authority

Although currently the setup will not use a certificate authority, this step will be needed in an upcoming MedPerf feature where the training startup kits will be securely transported through the MedPerf server. The current NV Flare - MedPerf integration code still expects a certificate authority to be associated with the training experiment.

Run the following command to associate a certificate authority:

```bash
medperf ca associate -t 1 -c 1 -y
```

## 2. Experiment Admin: Aggregator Setup

The operator of the aggregator server can be another user, not necessarily the admin. This tutorial will assume it's the same user for simplicity.

In this section, you will be registering the aggregator information and linking it to the training experiment.

### Register the Aggregator

When registering the aggregator information, you should register the address of the aggregator and the ports to be open when the aggregator server will start. We will choose two ports: `8102` and `8103`: one for training and one for admin interactions.

Note that the hostname should be reachable by the data owners. In a real experiment, it should be the public IP address or a registered domain name of the machine where the aggregator server will be hosted. For the tutorial, we will use an internal IP address since we will run everything in one machine. Run the following to get the hostname:

```bash
hostname -I | cut -d " " -f 1
```

Also, you will need to specify which container to use for running the aggregator later. For our case it's going to be the same node container submitted for the training experiment, which is the container of ID `3`.

Now register the aggregator:

```bash
medperf aggregator submit --name myaggreg --aggregation-container 3 --address <hostname_found> --port 8102 --port 8103
```

### Associate the aggregator with the experiment

The command below will link the aggregator with the training experiment you already submitted. By running `medperf training ls --mine` you will see your training experiment ID. By running `medperf aggregator ls --mine` you will see your aggregator ID. For this tutorial, the IDs will be both `1`.

```bash
medperf aggregator associate --aggregator_id 1 --training_exp_id 1
```

## 3. Experiment Admin: training configuration

In this section you will submit the required configuration for training. For our example with NV Flare, the configuration mainly consists of:

- The NV Flare's training job configuration (`meta.json`, `config_fed_client.json`, and `config_fed_server.json`). It will be submitted as a single plan file to the MedPerf server, so that data owners can review it before starting training.
- The startup kits for the aggregator and for the data owners will be created and submitted to the MedPerf server so that the data owners and the aggregator will later automatically pull them and use them when starting their nodes.

!!! note
    In an upcoming MedPerf release, the startup kits will be encrypted end-to-end so that they are securely transported from the admin to the data owners through MedPerf.

You will need to provide a folder for the following command that includes the necesary configuration files. You can check the folder `medperf_tutorial/training_config` to see how it's expected to be.

Now run the command below:

```bash
medperf training set_plan --training_exp_id 1 --config-path "medperf_tutorial/training_config"
```

### Start a Training Event

After setting the configuration, you should mark your training experiment as ready to accept data owners. The command below will do the job. You will need to provide the expected list of data owners in a yaml file. This file is already prepared for this tutorial and can be found at `medperf_tutorial/cols_list.yaml`.

Run the following command to start the training event:

```bash
medperf training start_event --name event1 --training_exp_id 1 --participants_list_file medperf_tutorial/cols_list.yaml
```

## 4. Experiment Admin: Starting the Aggregator

Now let's start the aggregator server:

```bash
medperf aggregator start --training_exp_id 1 --publish_on <found hostname>
```

The `--publish_on` argument specifies on which network interface to expose the aggregator. For the tutorial, using the hostname found will expose the aggregator to the internal network. In a real experiment where data owners are on different external machines, use `0.0.0.0`.

Please keep this terminal open and move to another terminal to start playing the data owner role.

## 5. Data Owner: Registering and Preparing the Data

Now let's play the role of the data owners. There will be two data owners: `testdo@example.com` and `testdo2@example.com`. You will learn how to play the role of the data owner using the first one. We provide a shortcut script to automatically run what's needed for the second data owner to avoid repetition.

Login as the first data owner:

```bash
medperf auth logout
medperf auth login -e testdo@example.com
```

### Register your dataset

We provide toy dataset of chest x-ray images and labels in the `medperf_tutorial` folder. Run the following to register the information of this dataset.

```bash
medperf dataset submit --data_prep 2 \
  --data_path medperf_tutorial/col1 \
  --labels_path medperf_tutorial/col1 \
  --name col1data \
  --description "some data" \
  --location mymachine
```

The option `--data_prep 2` specifies which data preparation container will be used in later steps to prepare your dataset. We are using the same container submitted by the training experiment owner.

### Process your data using the data preparation container

Now run preparation to transform your data as required by the experiment admin. Your dataset ID will be `1`. You can check by running `medperf dataset ls --mine`.

```bash
medperf dataset prepare --data_uid 1 
```

### Mark your dataset as ready

Now mark your dataset as ready for training:

```bash
medperf dataset set_operational --data_uid 1
```

This will also submit some statistics calculated on your data that could be useful for results analysis by the experiment admin.

## 6. Data Owner: Requesting participation

Now request participation in the training experiment:

```bash
medperf dataset associate  --data_uid 1 --training_exp_uid 1
```

## 7. Data Owner: Start the training node

Finally, start the training node:

```bash
medperf dataset train --data_uid 1 --training_exp_id 1
```

The process will keep waiting until the experiment admin submits the training job and signals your node to start training. Please keep this terminal open. You should move now to another terminal.

## 8. Data Owner: Setting up the second data owner

For the second data owner, you will do the same steps as the first data owner. To avoid repetition, we provide a script that you can run to quickly run what needs to be run by the second data owner:

```bash
bash medperf_tutorial/collab_shortcut.sh
```

You should move now to another terminal

## 9. Experiment Admin: Start the training

Now you have the aggregator and the two data owner nodes up and running. You can now as an experiment admin signal starting the training. Login in back as the admin to continue:

```bash
medperf auth logout
medperf auth login -e testmo@example.com
```

### Submit the training job

```bash
medperf training submit_job --training_exp_id 1
```

After running this, you can go and check that the terminals of the data owners and the aggregator are now showing that they are doing federated training.

## 10. Experiment Admin: Remote status check

In a real experiment, you probably won't have access to data owners terminals to see if everything is going fine. You can run the following command to check the status from your machine:

```bash
medperf training get_experiment_status --training_exp_id 1
```

## 11. Experiment Admin: Stop the training

After training is done, or if you want to just interrupt the training and stop it, you can run the following command:

```bash
medperf training close_event --training_exp_id 1
```

This concludes our tutorial!
