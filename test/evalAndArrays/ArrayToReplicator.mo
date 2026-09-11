within evalAndArrays;

block ArrayToReplicator "An array built from a scalar by an elementary CDL block"

  parameter Integer nZon = 3 "# of zones";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal for the replicator";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y[nZon] "Output of each zone";

  Buildings.Controls.OBC.CDL.Routing.RealScalarReplicator realScaRep(
    final nout=nZon) "Replicates the input to nZon outputs";


equation
  connect(u, realScaRep.u);
  connect(realScaRep.y, y);

end ArrayToReplicator;
