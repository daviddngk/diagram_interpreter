#Telecom Site Equipment Reference:
This document is a structured reference guide to assist LLMs in accurately identifying ports and connections in technical diagrams.
It provides descriptions of various telecom site equipment that include textual, image based and tabulated data for each item. Use this document to understand equipment function, identify features and ports and to build coded representations of the equipment and site that it is part of.
Port maps are provided to assist in location and identification of ports and connections to ports on the equipment. 
A key for the port map diagrams can be found here: https://storage.googleapis.com/context_image_bucket/port_map_key.png.

#Baseband 6648
##Description
Baseband 6648 is developed for 4G and 5G high-capacity sites and is the natural choice for sites with 5G midband and 5G high-band implementations.
Clear benefits with Baseband 6648 are higher capacity and simplified installation using 25G interfaces to new AIR and Radio products for midband and high-band. Baseband 6648 is a complementary addition to Ericsson's RAN Compute portfolio.
##Front Panel Image URL: https://storage.googleapis.com/context_image_bucket/BB6648_fp.png
##Port Map Image URL: https://storage.googleapis.com/context_image_bucket/BB6648_pm.png
##Port Definitions Table:
| id        | type     | location         | direction       | spec     | rate      |
|-----------|----------|------------------|------------------|----------|-----------|
| POWER-A   | power    | left-top         | input           | -48v     | n/a       |
| POWER-B   | power    | left-bottom      | input           | -48v     | n/a       |
| TN/IDL-A  | fiber    | top-row-1        | bi-directional  | QSFP28   | 4x25Gbps  |
| TN/IDL-B  | fiber    | top-row-2        | bi-directional  | SFP28    | 10/25Gbps |
| TN/IDL-C  | fiber    | top-row-3        | bi-directional  | SFP28    | 10/25Gbps |
| TN/IDL-D  | fiber    | top-row-4        | bi-directional  | SFP28    | 10/25Gbps |
| RI-A      | fiber    | top-row-5        | bi-directional  | SFP28    | 10/25Gbps |
| RI-B      | fiber    | top-row-6        | bi-directional  | SFP28    | 10/25Gbps |
| RI-C      | fiber    | top-row-7        | bi-directional  | SFP28    | 10/25Gbps |
| RI-D      | fiber    | top-row-8        | bi-directional  | SFP28    | 10/25Gbps |
| RI-E      | fiber    | top-row-9        | bi-directional  | SFP28    | 10/25Gbps |
| RI-F      | fiber    | top-row-10       | bi-directional  | SFP28    | 10/25Gbps |
| RI-G      | fiber    | top-row-11       | bi-directional  | SFP28    | 10/25Gbps |
| RI-H      | fiber    | top-row-12       | bi-directional  | SFP28    | 10/25Gbps |
| RI-J      | fiber    | top-row-13       | bi-directional  | SFP28    | 10/25Gbps |
| RI-K      | fiber    | top-row-14       | bi-directional  | SFP28    | 10/25Gbps |
| RI-L      | fiber    | top-row-15       | bi-directional  | SFP28    | 10/25Gbps |
| RI-M      | fiber    | top-row-16       | bi-directional  | SFP28    | 10/25Gbps |
| SYNC      | ethernet | far-right-top    | input           | RJ45     | n/a       |
| TN-E      | ethernet | far-right-middle | bi-directional  | RJ45     | n/a       |
| ALARM1    | alarm    | far-right-bottom | output          | RJ45     | n/a       |
| USB       | usb      | right-end-top    | bi-directional  | USB 3.0  | n/a       |
| LMT       | ethernet | right-end-middle | bi-directional  | RJ45     | n/a       |

#Baseband 6630
##Description
Baseband 6630 is part of the Ericsson Radio System and has a 19-inch, 1 HU building practice. Baseband 6630 is stand-alone and has its own climate control. It also has support for 15 CPRI ports.
Baseband 6630 has the following hardware characteristics:
•	19 inch wide, 1U high, 350mm deep 
•	2 x 10/1Gbps ports (SFP+/SFP)
•	2 x 100Mbps/1Gbps RJ45 electrical port
•	Support for single mode NR (5G high/AAS/mid/low band) or LTE or WCDMA or GSM
•	Hardware Prepared for Mixed Mode baseband NR (5G) + LTE
•	Support for Mixed Mode baseband: 
•	LTE + WCDMA
•	LTE + GSM
•	WCDMA + GSM
•	LTE + WCDMA + GSM
•	NR (5G) + LTE
•	15 x 2.5/4.9/9.8/10.1 Gbps Radio Interface ports
•	15 CPRI ports (LTE or WCDMA or GSM) or
•	15 CPRI ports (LTE, WCDMA, GSM in Mixed Mode baseband) or
•	9 CPRI ports (NR or NR+LTE) or
•	9 eCPRI ports (NR or LTE)
•	8 External alarm ports
•	Dual -48VDC power feeding
•	Built-in cell site router functionality 
•	Interface for Elastic RAN
##Front Panel Image URL: https://storage.googleapis.com/context_image_bucket/BB6630_fp.png
##Port Map Image URL: https://storage.googleapis.com/context_image_bucket/BB6630_pm.png
##Port Definitions Table:
| id      | type     | location         | direction       | spec       | rate              |
|---------|----------|------------------|------------------|------------|-------------------|
| POWER-A | power    | left-top         | input           | -48v       | n/a               |
| POWER-B | power    | left-bottom      | input           | -48v       | n/a               |
| TN-A    | fiber    | top-row-1        | bi-directional  | SFP/SFP+   | 10/1Gbps          |
| TN-B    | fiber    | top-row-2        | bi-directional  | SFP/SFP+   | 10/1Gbps          |
| IDL-A   | fiber    | top-row-3        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| IDL-B   | fiber    | top-row-4        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| RI-A    | fiber    | top-row-5        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| RI-B    | fiber    | top-row-6        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| RI-C    | fiber    | top-row-7        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| RI-D    | fiber    | top-row-8        | bi-directional  | CPRI       | 2.5/4.9/9.8/10.1Gbps |
| RI-E    | fiber    | top-row-9        | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-F    | fiber    | top-row-10       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-G    | fiber    | top-row-11       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-H    | fiber    | top-row-12       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-J    | fiber    | top-row-13       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-K    | fiber    | top-row-14       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-L    | fiber    | top-row-15       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-M    | fiber    | top-row-16       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-N    | fiber    | top-row-17       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-P    | fiber    | top-row-18       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| RI-Q    | fiber    | top-row-19       | bi-directional  | CPRI/eCPRI | 10/25Gbps          |
| TN-C    | ethernet | right-top-1      | bi-directional  | RJ45       | 100Mbps/1Gbps      |
| TN-D    | ethernet | right-bottom-1   | bi-directional  | RJ45       | 100Mbps/1Gbps      |
| SYNC    | ethernet | right-top-2      | input           | RJ45       | n/a               |
| SAU     |          | right-bottom-2   | bi-directional  | RJ45       |                   |
| LMT     |          | right-top-3      | bi-directional  | RJ45       |                   |
| EC      |          | right-bottom-3   | bi-directional  | RJ45       |                   |
| ALARM1  | alarm    | right-top-4      | output          | RJ45       | n/a               |
| ALARM2  | alarm    | right-bottom-5   | output          | RJ45       | n/a               |

#Router 6675
##Description
The 6675 combines multiple functions into a single platform that provides Layer
2 (Ethernet) network aggregation. The 6675 provides carrier-class reliability,
scalability, performance, and an optimal power footprint.
The Router 6675 will provide connection to the core network and transmission to each Baseband unit at the site or in the C-RAN exchange environment.
##Front Panel Image URL: https://storage.googleapis.com/context_image_bucket/R6675_fp.png
##Port Map Image URL: https://storage.googleapis.com/context_image_bucket/R6675_pm.png
##Port Definitions Table:
| id      | type        | location         | direction       | spec       | rate            |
|---------|-------------|------------------|------------------|------------|-----------------|
| POWER-A | power       | left-top         | input           | -48v       | n/a             |
| POWER-B | power       | left-bottom      | input           | -48v       | n/a             |
| 1       | fiber       | top-row-1        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 2       | fiber       | bottom-row-1     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 3       | fiber       | top-row-2        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 4       | fiber       | bottom-row-2     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 5       | fiber       | top-row-3        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 6       | fiber       | bottom-row-3     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 7       | fiber       | top-row-4        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 8       | fiber       | bottom-row-4     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 9       | fiber       | top-row-5        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 10      | fiber       | bottom-row-5     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 11      | fiber       | top-row-6        | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 12      | fiber       | bottom-row-6     | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 13      | fiber       | top-row-11       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 14      | fiber       | bottom-row-11    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 15      | fiber       | top-row-12       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 16      | fiber       | bottom-row-12    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 17      | fiber       | top-row-13       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 18      | fiber       | bottom-row-13    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 19      | fiber       | top-row-14       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 20      | fiber       | bottom-row-14    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 21      | fiber       | top-row-15       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 22      | fiber       | bottom-row-15    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 23      | fiber       | top-row-16       | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 24      | fiber       | bottom-row-16    | bi-directional  | SFP+       | 1/2.5/10Gbps    |
| 25      | fiber       | top-row-7        | bi-directional  | QSFP28     | 40/100Gbps      |
| 26      | fiber       | top-row-8        | bi-directional  | QSFP28     | 40/100Gbps      |
| 27      | fiber       | top-row-9        | bi-directional  | QSFP28     | 40/100Gbps      |
| 28      | fiber       | top-row-10       | bi-directional  | QSFP28     | 40/100Gbps      |
| TDD     | Fiber       | right-top-1      | bi-directional  | RJ45       |                 |
| BITS    | fiber       | right-bottom-1   | bi-directional  | RJ45       |                 |
| ALARM   | alarm       | right-top-2      | output          | RJ45       |                 |
| LMT     | ethernet    | right-bottom-2   | bi-directional  | RJ45       | 100/1000BaseT   |
| USB     | USB Type-A  | right-top-3      | bi-directional  | USB2.0     |                 |
| CONSOLE | RS232       | right-bottom-3   | bi-directional  | RJ45       |                 |

#Connection Examples:
Links to connection example images show how lines within images that connect between equipment nodes should be interpreted to determine connections or edges. Resolved connections are shown in the table accompanying each example.
##Connection Example 1: https://storage.googleapis.com/context_image_bucket/connection_example_1.png
Connections/Edges Example 1:
In this diagram the following connections are present:
| Source         | Source Port | Target        | Target Port |
|----------------|-------------|---------------|-------------|
| Router 6671    | 10          | Baseband 6630 | TN-A        |
| Router 6671    | 11          | Baseband 6648 | TN-C        |
| Baseband 6648  | RI-G        | Air 3278      | n/a         |
| Baseband 6630  | RI-A        | Air 4499      | n/a         |

##Connection Example 2: https://storage.googleapis.com/context_image_bucket/connection_example_2.png
Connections/Edges Example 2:
In this diagram the following connections are present:
| Source         | Source Port | Target        | Target Port |
|----------------|-------------|---------------|-------------|
| Router 6671    | 10          | Baseband 6630 | TN-A        |
| Router 6671    | 11          | Baseband 6648 | TN-C        |
| Baseband 6648  | RI-G        | Air 3278      | n/a         |
| Baseband 6630  | RI-A        | Air 4499      | n/a         |
| GPS Antenna    | n/a         | Baseband 6648 | Sync        |

##Connection Example 3: https://storage.googleapis.com/context_image_bucket/connection_example_3.png
Connections/Edges Example 3:
In this diagram the following connections are present:
| Source         | Source Port | Target        | Target Port |
|----------------|-------------|---------------|-------------|
| Router 6671    | 10          | Baseband 6630 | TN-A        |
| Router 6671    | 11          | Baseband 6648 | TN-C        |
| Baseband 6648  | RI-G        | Air 3278      | n/a         |
| Baseband 6648  | RI-H        | Air 3278      | n/a         |
| Baseband 6630  | RI-A        | Air 4499      | n/a         |
| Baseband 6630  | RI-B        | Air 4499      | n/a         |
| GPS Antenna    | n/a         | Baseband 6648 | Sync        |


