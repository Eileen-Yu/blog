---
title: GSoC 22 Package Hunter for K8s
categories: [tech]
---

### Introduction

This summer, I was fortunate to participate in the GitLab GSoC program, and work with the security team. I had a blast and I want to share my experience with you!

### Mentors

[Dennis Appelt](https://gitlab.com/dappelt)

[Ethan Strike](https://gitlab.com/estrike)

Special thanks to my mentors! Dennis is my direct mentor who supported me daily over the project developing. Ethan manages the Security Research team. He kept track of our progress and give much technical & non-technical help. I appreciate their kindness and guidance to help me succeed with the project.

Also, I want to thank all colleagues of the Security team. Their profession and friendliness shows the charm of GitLab culture.

### About Project

[Package Hunter](https://about.gitlab.com/blog/2021/07/23/announcing-package-hunter/) is a GitLab open source tool for detecting malicious code. It saves developers' valuable time to check third party dependencies' reliability, and to maintain application security.

Before my project, Package Hunter was run in a virtual machine, and was called by post request with source code in the request body. Then a Docker container would be set up on a host, the source code would be copied into the container, and the installation command for dependencies would be run. During installation, Falco is used to check the behavior of dependencies against a custom rule set and then sends alerts via its gRPC API.

My project of GSoC aims to bring Package Hunter to Kubernetes as a service/deployment. By deploying it on the Kubernetes cluster, there would be some even more obvious improvement:

- Provide a native environment for Falco monitoring/alerting

- Run Package Hunter in a stable and scalable manner

- Decouple the system into individual components

- Improve Disk & Time consuming by K8s features

Therefore, the introduction of Kubernetes would grant Package Hunter more robustness, flexibility and portability.

`ORIGIN`: [Gitlab-GSoC-2022-Project](https://gitlab.com/gitlab-com/marketing/community-relations/contributor-program/gsoc-2022/-/issues/2)

`STACK`: Kubernetes, Node.JS, Helm, GKE, Falco, GRPC

`DELIVERY`:

- [Package-Hunter](https://gitlab.com/gitlab-org/security-products/package-hunter)
- [Package-Hunter-Operator](https://gitlab.com/gitlab-com/gl-security/security-research/package-hunter-runner-integration)

### Architecture Design

![design](https://user-images.githubusercontent.com/48944635/190844177-9d3498da-cad2-41ec-8115-ca810d3a578e.png)

### RoadMap

#### Package-Hunter

- Phase 0: Optimize memory by recycling finished tasks
- Phase 1:
  - 1.1 Code Refactor: Make product extensible and backward-compatible
  - 1.2 Feature: Setup connection between Package Hunter and Falco in K8s
- Phase 2:
  - 2.1 Feature: Initialize K8s Job Scheduling
  - 2.2 Feature: Recycling & Status Management

#### Operator

1. Migrate Falco to K8s DaemonSet
2. Secret Provisioning
   - Enable Secret Auto-generation and Installation
   - Mount Configuration through K8s Secret
   - Add Scripts to Simplify Configuration
3. Alerts Collection
   - Introduce Falco-sidekick to Aggregate Alerts
   - Configure Sidekick Webhook
   - Documentation
4. Package Hunter K8s Authorization and Authentication

### Challenges

During the project, we found there are several things that needed to be covered:

First, we want to keep a consistent user interface to reduce the learning curve from the user side.

Second, backward compatibility is important. Though we were migrating Package Hunter to Kubernetes, the Docker version may still be useful for local development and current GitLab CI. We took the timeto provide both approaches with the least redundancy.

For future extensibility and maintenance, we also brought flexibility to support more programming languages and package managers potentially.

To reach these goals, we worked carefully on code refactoring. We managed to split the origin complex codebase into multiple layers that are loosely coupled with each other. Besides, we also reached a consistent coding style to ensure any collaborations on the same standard.

Apparently, there are always unexpected challenges from time to time. Thanks to my mentors for their patient guidance and warm support, we conquered them and achieved success. I will be always grateful for this GSoC experience, which taught me far more than programming skill itself.

### Deliverable

#### Prerequisites

Prepare the cluster as GKE. Deploy Falco stacks through Helm Charts.

![](https://user-images.githubusercontent.com/48944635/192657777-083c760c-f20a-4713-a1a8-5f8b07bf8d0a.png)

#### Have the service running

To reach fault-tolerance and scalability, we run our API service in the form of a K8s Deployment.

![](https://user-images.githubusercontent.com/48944635/192657924-be24ce52-ce98-4f4f-8580-e0802362b880.png)

#### Send source code for check

For load balancing, we set up a K8s service as a bridge.

![](https://user-images.githubusercontent.com/48944635/192658184-20c447e0-fe20-48d5-8af8-22f47f8d8d4f.png)

#### Get alerts by ID

For simplicity, we construct the data in the plain JSON form.

![](https://user-images.githubusercontent.com/48944635/192658352-34c9cd67-f62c-4e2c-86a7-6ba629e47108.png)

### Future Work

Even though GSoC is over, there is still big improvement space for Package Hunter.

![Future work](https://user-images.githubusercontent.com/48944635/190844226-c916cc72-fc52-4870-8174-6e2c9db3b811.png)

For Package Hunter, we can introduce a Kubernetes Ingress. This would help to bind a GitLab internal DNS with the service, which can bring convenience for access permission and routing flexibility.

As for how to fetch the source code for detection, we may introduce Kubernetes Persistent Volume. The volume would be mounted to both the deployment and job, so they can read / write it as local disk. This can reduce unnecessary I/Os and speed up the job.

In addition, a standalone place to store cache alerts would grant scalability for Package Hunter. In case we may have more replicas in the future, they can directly get alerts from the cache. Reddis can be a good candidate.

We welcome anyone who have passion for the open source world to contribute to the amazing community! See more on our [Contributing Guide](https://about.gitlab.com/community/contribute/development/).
