# Tutorial

## Requirements

To run this tutorial, you need a machine with the following requirements:

- Internet access.
- Web browser (to connect to codespaces).

## Training Setup with MedPerf (Model Owner)

```bash
medperf auth login -e modelowner@example.com
```

### Define the data preparation MLCube

- Prepare the data preparation pipeline logic that will transform the raw clinical data into AI-ready data. This will be an MLCube

### Register the MLCube

```bash
medperf mlcube submit -n prep \
    -m https://storage.googleapis.com/medperf-storage/rsna2023/mlcube.yaml
```

### Define the training MLCube

- Prepare the training logic using OpenFL and GaNDLF

### Register the Training MLCube

```bash
medperf mlcube submit -n testfl \
    -m https://storage.googleapis.com/medperf-storage/rsna2023/mlcube_rsna.yaml \
    -p https://storage.googleapis.com/medperf-storage/rsna2023/plan_final.yaml \
    -a https://storage.googleapis.com/medperf-storage/rsna2023/init_weights_rsna2023.tar.gz
```

### Register the Training Experiment

```bash
medperf training submit -n trainexp -d trainexp -p 1 -m 2
```

The server admin should approve the experiment.
Run:

```bash
bash admin_training_approval.sh
```

## Aggregator Setup with MedPerf (Aggregator Owner)

```bash
medperf auth login -e aggowner@example.com
```

### register aggregator

```bash
medperf aggregator submit -n aggreg -a $(hostname --fqdn) -p 50273
```

### Associate the aggregator with the experiment

```bash
medperf aggregator associate -a 1 -t 1
```

## Data preparation (Training Data Owner)

```bash
medperf auth login -e traincol1@example.com
```

### Process your data using the data prep mlcube

```bash
medperf dataset create -p 1 -d datasets/col1 -l datasets/col1 --name col1 --description col1data --location col1location
```

### Register your dataset

find Hash:

```bash
medperf dataset ls
```

```bash
medperf dataset submit -d <hash_found>
```

### Request participation in the training experiment

```bash
medperf training associate_dataset -t 1 -d 1
```

## Redo the same with collaborator 2

```bash
bash shortcut.sh
```

## Accepting Training Participation (Model Owner)

```bash
medperf auth login -e modelowner@example.com
```

### Accept participation requests

```bash
medperf training approve_association -t 1 -a 1
medperf training approve_association -t 1 -d 1
medperf training approve_association -t 1 -d 2
```

### Lock the experiment

```bash
medperf training lock -t 1
```

## Run the Aggregator (Aggregator Owner)

```bash
medperf auth login -e aggowner@example.com
```

```bash
medperf aggregator start -a 1 -t 1
```

(Now move to another terminal)

## Run Training (Training Data Owner)

First collaborator:

```bash
medperf auth login -e traincol1@example.com
```

```bash
medperf training run -d 1 -t 1
```

(Now move to another terminal)

Second collaborator:

```bash
medperf auth login -e traincol2@example.com
```

```bash
medperf training run -d 2 -t 1
```
