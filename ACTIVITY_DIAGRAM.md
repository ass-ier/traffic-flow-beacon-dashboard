# SUMO Traffic Management Dashboard - Activity Diagram

## Main System Activity Flow

```mermaid
graph TD
    A[User Opens Dashboard] --> B[Initialize React App]
    B --> C[Load SUMOContext]
    C --> D[Check SUMO Connection Status]

    D --> E{SUMO Connected?}
    E -->|No| F[Display Sample Data]
    E -->|Yes| G[Fetch Real SUMO Data]

    F --> H[Render Traffic Map]
    G --> H[Render Traffic Map]

    H --> I[Display Map Components]
    I --> J[Show Vehicle Markers]
    I --> K[Show Intersection Status]
    I --> L[Show Road Congestion]
    I --> M[Show Connection Status]

    %% User Interactions
    N[User Interactions] --> O{Action Type?}

    O -->|Connect to SUMO| P[Attempt SUMO Connection]
    P --> Q{Connection Success?}
    Q -->|Yes| R[Start Real-time Data Stream]
    Q -->|No| S[Show Error Message]
    S --> T[Retry Connection]
    T --> P

    O -->|Select Intersection| U[Show Intersection Details]
    U --> V[Display Traffic Light Status]
    V --> W[Show Queue Length]
    W --> X[Provide Override Options]

    O -->|Override Traffic Light| Y[Send Override Command]
    Y --> Z{SUMO Connected?}
    Z -->|Yes| AA[Execute SUMO Command]
    Z -->|No| BB[Simulate Override]
    AA --> CC[Update Traffic Light State]
    BB --> CC

    O -->|Change Map View| DD[Update Map Layers]
    DD --> EE{View Type?}
    EE -->|Congestion| FF[Show Traffic Density]
    EE -->|Traffic Lights| GG[Show Signal States]
    EE -->|Vehicles| HH[Show Vehicle Positions]

    O -->|Expand Connection Status| II[Show Detailed Metrics]
    II --> JJ[Display Latency]
    II --> KK[Show Last Update Time]
    II --> LL[Show Reconnection Attempts]

    %% Real-time Data Flow
    R --> MM[WebSocket Connection]
    MM --> NN[Receive Vehicle Data]
    MM --> OO[Receive Intersection Data]
    MM --> PP[Receive Road Data]

    NN --> QQ[Update Vehicle Markers]
    OO --> RR[Update Traffic Lights]
    PP --> SS[Update Road Colors]

    QQ --> TT[Re-render Map]
    RR --> TT
    SS --> TT

    %% Error Handling
    UU[Connection Error] --> VV[Show Error State]
    VV --> WW[Attempt Reconnection]
    WW --> XX{Max Retries?}
    XX -->|No| P
    XX -->|Yes| YY[Use Sample Data]

    %% Styling
    classDef userAction fill:#e1f5fe
    classDef systemProcess fill:#f3e5f5
    classDef dataFlow fill:#e8f5e8
    classDef decision fill:#fff3e0
    classDef error fill:#ffebee

    class A,N,O userAction
    class B,C,H,I,J,K,L,M,DD,II systemProcess
    class G,R,MM,NN,OO,PP,QQ,RR,SS dataFlow
    class D,E,Q,Z,EE,XX decision
    class S,UU,VV,YY error
```

## Detailed User Journey Flows

### 1. Application Startup Flow

```mermaid
sequenceDiagram
    participant User
    participant React App
    participant SUMO Context
    participant SUMO Service
    participant Map Component

    User->>React App: Opens Dashboard
    React App->>SUMO Context: Initialize Context
    SUMO Context->>SUMO Service: Check Connection

    alt SUMO Available
        SUMO Service-->>SUMO Context: Connection Established
        SUMO Context-->>Map Component: Real Data Stream
    else SUMO Unavailable
        SUMO Service-->>SUMO Context: Connection Failed
        SUMO Context-->>Map Component: Sample Data
    end

    Map Component-->>User: Display Traffic Map
```

### 2. SUMO Connection Flow

```mermaid
flowchart TD
    A[User Clicks Connect] --> B[Validate Connection Settings]
    B --> C[Attempt WebSocket Connection]
    C --> D{Connection Successful?}

    D -->|Yes| E[Establish TraCI Connection]
    E --> F{TraCI Success?}
    F -->|Yes| G[Start Data Streaming]
    F -->|No| H[Show TraCI Error]

    D -->|No| I[Show WebSocket Error]

    G --> J[Update Connection Status]
    J --> K[Switch to Real Data]
    K --> L[Update Map Display]

    H --> M[Retry Connection]
    I --> M
    M --> N{Retry Count < Max?}
    N -->|Yes| C
    N -->|No| O[Give Up - Use Sample Data]
```

### 3. Traffic Light Override Flow

```mermaid
flowchart TD
    A[User Selects Intersection] --> B[Show Intersection Panel]
    B --> C[Display Current Status]
    C --> D[User Clicks Override]

    D --> E{SUMO Connected?}
    E -->|Yes| F[Send TraCI Command]
    E -->|No| G[Simulate Override]

    F --> H{Command Success?}
    H -->|Yes| I[Update Traffic Light]
    H -->|No| J[Show Error Message]

    G --> I
    I --> K[Update Map Display]
    K --> L[Log Action]

    J --> M[Retry Option]
    M --> D
```

### 4. Real-time Data Processing Flow

```mermaid
flowchart LR
    A[SUMO Simulation] --> B[TraCI Interface]
    B --> C[Backend Service]
    C --> D[WebSocket Server]
    D --> E[Frontend Client]

    E --> F{Data Type?}
    F -->|Vehicles| G[Update Vehicle Markers]
    F -->|Intersections| H[Update Traffic Lights]
    F -->|Roads| I[Update Congestion Colors]

    G --> J[Re-render Map]
    H --> J
    I --> J

    J --> K[Update Statistics]
    K --> L[Log Performance Metrics]
```

### 5. Map View Change Flow

```mermaid
stateDiagram-v2
    [*] --> DefaultView
    DefaultView --> CongestionView : User selects Congestion
    DefaultView --> TrafficLightView : User selects Traffic Lights
    DefaultView --> VehicleView : User selects Vehicles

    CongestionView --> TrafficLightView : Change view
    CongestionView --> VehicleView : Change view
    CongestionView --> DefaultView : Reset

    TrafficLightView --> CongestionView : Change view
    TrafficLightView --> VehicleView : Change view
    TrafficLightView --> DefaultView : Reset

    VehicleView --> CongestionView : Change view
    VehicleView --> TrafficLightView : Change view
    VehicleView --> DefaultView : Reset

    state CongestionView {
        [*] --> ShowRoadColors
        ShowRoadColors --> UpdateLegend
        UpdateLegend --> FilterByDensity
    }

    state TrafficLightView {
        [*] --> ShowSignalStates
        ShowSignalStates --> UpdateIntersections
        UpdateIntersections --> EnableOverrides
    }

    state VehicleView {
        [*] --> ShowVehicleMarkers
        ShowVehicleMarkers --> ClusterVehicles
        ClusterVehicles --> UpdatePositions
    }
```

## Component Interaction Activity

```mermaid
graph TB
    subgraph "User Interface Layer"
        A[TrafficMap Component]
        B[SUMOConnectionStatus]
        C[IntersectionStatus]
        D[MapLayers]
        E[ControlPanel]
    end

    subgraph "Data Layer"
        F[SUMOContext]
        G[useSUMOData Hook]
        H[SUMODataService]
    end

    subgraph "Backend Services"
        I[WebSocket Server]
        J[TraCI Client]
        K[SUMO Simulation]
    end

    A --> F
    B --> F
    C --> F
    D --> G
    E --> F

    F --> G
    G --> H
    H --> I
    I --> J
    J --> K

    K --> J
    J --> I
    I --> H
    H --> G
    G --> F
    F --> A
```

## Error Handling Activity Flow

```mermaid
flowchart TD
    A[System Operation] --> B{Error Occurred?}
    B -->|No| C[Continue Normal Flow]
    B -->|Yes| D{Error Type?}

    D -->|Connection Error| E[Show Connection Status]
    D -->|Data Error| F[Use Cached Data]
    D -->|UI Error| G[Error Boundary Catch]

    E --> H[Attempt Reconnection]
    H --> I{Reconnection Success?}
    I -->|Yes| J[Resume Normal Operation]
    I -->|No| K[Use Sample Data]

    F --> L[Display Warning]
    L --> M[Continue with Available Data]

    G --> N[Show Error Message]
    N --> O[Reload Component]

    J --> C
    K --> C
    M --> C
    O --> A
```

This activity diagram covers:

- **Main system flow** from startup to operation
- **User interaction patterns** for all major features
- **Real-time data processing** workflows
- **Error handling and recovery** mechanisms
- **Component interactions** and data flow
- **State management** across the application

The diagrams show how users interact with the system, how data flows through the components, and how the system handles various scenarios including errors and edge cases.
