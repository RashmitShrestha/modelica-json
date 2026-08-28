within evalAndArrays;

block ArrayToReplicator "An array built from a scalar by an elementary CDL block"

  parameter Integer nZon = 3 "# of zones";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "input signal for the replicator";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y[nZon] "output of each zone";

  Buildings.Controls.OBC.CDL.Routing.RealScalarReplicator realScaRep(
    final nout=nZon) "replicates the input to nZon outputs";


equation
  connect(u, realScaRep.u);
  connect(realScaRep.y, y);

end ArrayToReplicator;
