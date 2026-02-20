# SkinScan AI - Level 0 Data Flow Diagram

This diagram represents the simplest high-level view of the SkinScan system, focusing solely on the core interaction between the User, the System, and the Central Database.

```mermaid
graph LR
    %% Entities
    U[USER]
    S([SKIN DISEASE<br>IDENTIFICATION<br>SYSTEM])
    D[(CENTRAL<br>DATABASE)]

    %% Connections (User <-> System)
    U -->|Image / Request| S
    S -->|Result / Data| U

    %% Connections (System <-> Database)
    S -->|Save Data| D
    D -->|Retrieve Data| S

    %% Styling to Match Example
    classDef entity fill:#fff,stroke:#000,stroke-width:2px;
    classDef process fill:#fff,stroke:#000,stroke-width:2px,rx:100,ry:100;
    classDef store fill:#fff,stroke:#000,stroke-width:2px,cyl;

    class U entity;
    class S process;
    class D store;
```
